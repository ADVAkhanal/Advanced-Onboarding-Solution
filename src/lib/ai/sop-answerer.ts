// SOP answerer: orchestrates redaction → retrieval → Claude tool-use call →
// server-side gating → escalation decision.
//
// The answerShown that comes out of here is *only* set when every gate
// passes. The model can't smuggle answers past the server gate because we
// re-check confidence / triggers / null after the model returns.

import type { AuthenticatedUser } from "../auth";
import { logger } from "../logger";
import { recordAIAction } from "./audit";
import { getAIProvider, type AIToolDefinition } from "./provider";
import { hashQuestion, redactProhibited } from "./redaction";
import type { RetrievedChunk } from "./sop-retriever";
import { retrieveChunks } from "./sop-retriever";

const CONFIDENCE_FLOOR = 0.7;
const MAX_QUESTION_CHARS = 4000;

export type EscalationTriggers = {
  unsupported: boolean;
  weak: boolean;
  conflicting: boolean;
  safety_critical: boolean;
  quality_critical: boolean;
  customer_impacting: boolean;
};

export type ModelOutput = {
  answer_or_null: string | null;
  citations: Array<{ chunk_id: string; supports: string }>;
  confidence: number;
  triggers: EscalationTriggers;
  escalation_summary: string | null;
};

export type AnswerResult = {
  outcome: "ANSWERED" | "REFUSED" | "ESCALATED" | "PROVIDER_ERROR" | "REJECTED_BY_FILTER";
  answerShown: string | null;
  citations: Array<{ chunkId: string; documentId: string; documentTitle: string; headingPath: string; supports: string }>;
  triggers: EscalationTriggers;
  escalationReason: string | null;
  confidence: number | null;
  retrievedChunks: RetrievedChunk[];
  redactionApplied: { classes: string[]; counts: Record<string, number> };
  errorMessage?: string;
  providerMetadata: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
  };
};

const TOOL: AIToolDefinition = {
  name: "respond",
  description:
    "Return your grounded answer plus a confidence score and the six escalation triggers. Set answer_or_null to NULL if the provided chunks do not materially support an answer.",
  input_schema: {
    type: "object",
    required: ["answer_or_null", "citations", "confidence", "triggers"],
    additionalProperties: false,
    properties: {
      answer_or_null: {
        type: ["string", "null"],
        description: "Plain-English answer in 1-4 short paragraphs. NULL if not supported."
      },
      citations: {
        type: "array",
        items: {
          type: "object",
          required: ["chunk_id", "supports"],
          additionalProperties: false,
          properties: {
            chunk_id: { type: "string" },
            supports: { type: "string" }
          }
        }
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      triggers: {
        type: "object",
        required: [
          "unsupported",
          "weak",
          "conflicting",
          "safety_critical",
          "quality_critical",
          "customer_impacting"
        ],
        additionalProperties: false,
        properties: {
          unsupported: { type: "boolean" },
          weak: { type: "boolean" },
          conflicting: { type: "boolean" },
          safety_critical: { type: "boolean" },
          quality_critical: { type: "boolean" },
          customer_impacting: { type: "boolean" }
        }
      },
      escalation_summary: {
        type: ["string", "null"]
      }
    }
  }
};

const SYSTEM_PROMPT = `You are the Advanced Shop SOP assistant. Advanced Consulting Inc. runs a precision-machining shop serving aerospace, defense, oil & gas, and food-grade customers under ISO 9001 and AS9100. Your job is to answer employee questions ONLY from the approved internal SOP excerpts provided in the user message.

HARD RULES:
1. Use ONLY the supplied chunks. Do not draw on outside knowledge, training data, customer specifications, or assumptions.
2. Cite every claim you make. Citations refer to chunk IDs from the supplied list.
3. If the supplied chunks do not materially support an answer, set answer_or_null to NULL.
4. Set confidence to your honest self-estimate that the answer is fully supported. Use 0.0 if no support at all, 1.0 only when the answer is fully and unambiguously documented.
5. Classify the six escalation triggers honestly. False negatives on safety/quality/customer triggers are the worst possible failure mode.

TRIGGER DEFINITIONS:
- unsupported: no chunk materially supports an answer.
- weak: support is partial, inferential, or paraphrased loosely.
- conflicting: two or more chunks give different guidance OR your draft answer contradicts a chunk.
- safety_critical: question touches PPE, lockout/tagout, machine guarding, chemical handling, emergency response, evacuation, ergonomic-injury risk, electrical, pressurized systems, hot work, confined space.
- quality_critical: question touches FAI, first-piece inspection, CMM verification, nonconformance disposition, customer-specific quality requirements, AS9100 records, calibration, traceability.
- customer_impacting: question affects an order, ship date, customer-specific spec, customer-controlled drawing or process, RMA, customer audit response.

If any trigger fires, write a one-paragraph escalation_summary that a busy manager can read in 10 seconds and use to decide what to do.

Always return your decision via the 'respond' tool — never as free text.`;

function buildUserMessage(question: string, chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return `Question:\n${question}\n\nApproved SOP excerpts:\n(none — no approved SOP chunks were retrieved for this question)`;
  }

  const renderedChunks = chunks
    .map((chunk) => {
      const flags = [
        chunk.safetyCritical ? "SAFETY-CRITICAL" : null,
        chunk.qualityCritical ? "QUALITY-CRITICAL" : null,
        chunk.customerImpacting ? "CUSTOMER-IMPACTING" : null
      ]
        .filter(Boolean)
        .join(", ");
      const header = `--- chunk_id: ${chunk.chunkId} | document: ${chunk.documentTitle} | section: ${chunk.headingPath || "(no heading)"}${flags ? ` | flags: ${flags}` : ""} ---`;
      return `${header}\n${chunk.content}`;
    })
    .join("\n\n");

  return `Question:\n${question}\n\nApproved SOP excerpts:\n${renderedChunks}`;
}

export async function answerSopQuestion(
  user: AuthenticatedUser,
  rawQuestion: string,
  options: { modelOverride?: string } = {}
): Promise<AnswerResult> {
  const question = (rawQuestion ?? "").trim();
  if (!question) {
    throw new Error("Empty question");
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return {
      outcome: "REJECTED_BY_FILTER",
      answerShown: null,
      citations: [],
      triggers: emptyTriggers(),
      escalationReason: null,
      confidence: null,
      retrievedChunks: [],
      redactionApplied: { classes: [], counts: {} },
      errorMessage: `Question exceeds ${MAX_QUESTION_CHARS} characters.`,
      providerMetadata: { provider: "anthropic", model: "", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 }
    };
  }

  const redaction = redactProhibited(question);
  const redactedQuestion = redaction.redactedText;

  const chunks = await retrieveChunks(user, redactedQuestion);

  if (chunks.length === 0) {
    const triggers = emptyTriggers();
    triggers.unsupported = true;
    const result: AnswerResult = {
      outcome: "ESCALATED",
      answerShown: null,
      citations: [],
      triggers,
      escalationReason:
        "No approved SOP chunks were retrieved for this question. A human needs to confirm whether an SOP exists or needs to be authored.",
      confidence: 0,
      retrievedChunks: [],
      redactionApplied: { classes: redaction.applied, counts: redaction.counts as Record<string, number> },
      providerMetadata: { provider: "anthropic", model: "", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 }
    };
    await recordAIAction({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "sop.ask",
      provider: result.providerMetadata.provider,
      model: result.providerMetadata.model,
      promptClass: "sop_ask",
      redactionApplied: { classes: redaction.applied, counts: redaction.counts as Record<string, number> },
      citationCount: 0,
      confidence: 0,
      outcome: result.outcome,
      requestId: hashQuestion(redactedQuestion),
      departmentId: user.departmentId ?? undefined
    });
    return result;
  }

  const provider = getAIProvider(options.modelOverride);
  const userMessage = buildUserMessage(redactedQuestion, chunks);

  const aiResponse = await provider.callStructured<ModelOutput>({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    tool: TOOL,
    maxOutputTokens: 1024,
    cacheSystemPrompt: true
  });

  const providerMetadata = {
    provider: provider.providerName,
    model: provider.modelName,
    inputTokens: aiResponse.inputTokens,
    outputTokens: aiResponse.outputTokens,
    cacheReadTokens: aiResponse.cacheReadTokens
  };

  if (aiResponse.rawError || !aiResponse.output) {
    const errorMessage = aiResponse.rawError ?? "Model returned no structured output.";
    logger.warn({ err: errorMessage }, "SOP answerer provider error");
    await recordAIAction({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "sop.ask",
      provider: providerMetadata.provider,
      model: providerMetadata.model,
      promptClass: "sop_ask",
      inputTokens: providerMetadata.inputTokens,
      outputTokens: providerMetadata.outputTokens,
      cacheReadTokens: providerMetadata.cacheReadTokens,
      redactionApplied: { classes: redaction.applied, counts: redaction.counts as Record<string, number> },
      citationCount: 0,
      outcome: "PROVIDER_ERROR",
      errorMessage,
      requestId: hashQuestion(redactedQuestion),
      departmentId: user.departmentId ?? undefined
    });
    return {
      outcome: "PROVIDER_ERROR",
      answerShown: null,
      citations: [],
      triggers: emptyTriggers(),
      escalationReason: null,
      confidence: null,
      retrievedChunks: chunks,
      redactionApplied: { classes: redaction.applied, counts: redaction.counts as Record<string, number> },
      errorMessage,
      providerMetadata
    };
  }

  const model = aiResponse.output;
  const triggers = normalizeTriggers(model.triggers);
  const escalationFromFlaggedDoc = chunks.some(
    (chunk) => chunk.safetyCritical || chunk.qualityCritical || chunk.customerImpacting
  );

  if (escalationFromFlaggedDoc) {
    triggers.safety_critical = triggers.safety_critical || chunks.some((c) => c.safetyCritical);
    triggers.quality_critical = triggers.quality_critical || chunks.some((c) => c.qualityCritical);
    triggers.customer_impacting = triggers.customer_impacting || chunks.some((c) => c.customerImpacting);
  }

  const anyTrigger = Object.values(triggers).some(Boolean);
  const confidence = clamp(model.confidence, 0, 1);
  const supportedAnswer: boolean = Boolean(model.answer_or_null && model.answer_or_null.trim().length > 0);
  const requiresEscalation = anyTrigger || confidence < CONFIDENCE_FLOOR || !supportedAnswer;

  const validCitations = (model.citations ?? [])
    .map((citation, rank) => {
      const chunk = chunks.find((c) => c.chunkId === citation.chunk_id);
      if (!chunk) return null;
      return {
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        headingPath: chunk.headingPath,
        supports: citation.supports,
        rank
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const outcome: AnswerResult["outcome"] = requiresEscalation
    ? "ESCALATED"
    : validCitations.length === 0
      ? "REFUSED"
      : "ANSWERED";

  const answerShown = outcome === "ANSWERED" ? model.answer_or_null : null;
  const escalationReason = requiresEscalation
    ? model.escalation_summary?.trim() || buildFallbackReason(triggers, confidence, supportedAnswer)
    : null;

  await recordAIAction({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "sop.ask",
    provider: providerMetadata.provider,
    model: providerMetadata.model,
    promptClass: "sop_ask",
    inputTokens: providerMetadata.inputTokens,
    outputTokens: providerMetadata.outputTokens,
    cacheReadTokens: providerMetadata.cacheReadTokens,
    redactionApplied: { classes: redaction.applied, counts: redaction.counts as Record<string, number> },
    citationCount: validCitations.length,
    confidence,
    outcome,
    requestId: hashQuestion(redactedQuestion),
    departmentId: user.departmentId ?? undefined
  });

  return {
    outcome,
    answerShown,
    citations: validCitations.map(({ chunkId, documentId, documentTitle, headingPath, supports }) => ({
      chunkId,
      documentId,
      documentTitle,
      headingPath,
      supports
    })),
    triggers,
    escalationReason,
    confidence,
    retrievedChunks: chunks,
    redactionApplied: { classes: redaction.applied, counts: redaction.counts as Record<string, number> },
    providerMetadata
  };
}

function emptyTriggers(): EscalationTriggers {
  return {
    unsupported: false,
    weak: false,
    conflicting: false,
    safety_critical: false,
    quality_critical: false,
    customer_impacting: false
  };
}

function normalizeTriggers(raw: EscalationTriggers | undefined): EscalationTriggers {
  if (!raw) return emptyTriggers();
  return {
    unsupported: Boolean(raw.unsupported),
    weak: Boolean(raw.weak),
    conflicting: Boolean(raw.conflicting),
    safety_critical: Boolean(raw.safety_critical),
    quality_critical: Boolean(raw.quality_critical),
    customer_impacting: Boolean(raw.customer_impacting)
  };
}

function clamp(value: number, lo: number, hi: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(hi, Math.max(lo, value));
}

function buildFallbackReason(triggers: EscalationTriggers, confidence: number, supportedAnswer: boolean): string {
  const parts: string[] = [];
  if (triggers.unsupported) parts.push("No SOP chunk materially supports an answer.");
  if (triggers.weak) parts.push("Support is partial or inferential.");
  if (triggers.conflicting) parts.push("Retrieved chunks give conflicting guidance.");
  if (triggers.safety_critical) parts.push("Question touches safety-critical procedure.");
  if (triggers.quality_critical) parts.push("Question touches quality-critical / AS9100 procedure.");
  if (triggers.customer_impacting) parts.push("Question affects a customer order or spec.");
  if (!supportedAnswer) parts.push("Model declined to produce a grounded answer.");
  if (confidence < CONFIDENCE_FLOOR) parts.push(`Model confidence ${confidence.toFixed(2)} below ${CONFIDENCE_FLOOR}.`);
  return parts.join(" ") || "Escalated for human review.";
}

export const __testHooks = {
  CONFIDENCE_FLOOR,
  MAX_QUESTION_CHARS,
  SYSTEM_PROMPT,
  TOOL
};
