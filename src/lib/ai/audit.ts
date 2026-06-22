import { prisma } from "../prisma";
import type { RedactionClass } from "./redaction";

export type AIAuditInput = {
  organizationId: string;
  actorId?: string | null;
  action: string;
  provider: string;
  model: string;
  promptClass: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  redactionApplied?: { classes: RedactionClass[]; counts: Record<string, number> } | null;
  citationCount?: number;
  confidence?: number | null;
  outcome: string;
  requestId?: string | null;
  errorMessage?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  estimatedCostCents?: number | null;
  departmentId?: string | null;
  ownerId?: string | null;
};

export async function recordAIAction(input: AIAuditInput) {
  await prisma.aIActionLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? undefined,
      action: input.action,
      provider: input.provider,
      model: input.model,
      promptClass: input.promptClass,
      inputTokens: input.inputTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      cacheReadTokens: input.cacheReadTokens ?? 0,
      redactionApplied: input.redactionApplied === null
        ? undefined
        : input.redactionApplied
          ? JSON.parse(JSON.stringify(input.redactionApplied))
          : undefined,
      citationCount: input.citationCount ?? 0,
      confidence: input.confidence ?? undefined,
      outcome: input.outcome,
      requestId: input.requestId ?? undefined,
      errorMessage: input.errorMessage ?? undefined,
      departmentId: input.departmentId ?? undefined,
      ownerId: input.ownerId ?? undefined,
      createdById: input.actorId ?? undefined
    }
  });
}
