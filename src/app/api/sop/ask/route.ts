import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok, HttpError } from "@/lib/http";
import { answerSopQuestion } from "@/lib/ai/sop-answerer";
import { hashQuestion, redactProhibited } from "@/lib/ai/redaction";
import { persistSopQueryAndEscalation } from "@/lib/ai/sop-escalator";

export const dynamic = "force-dynamic";

const askSchema = z.object({
  question: z.string().trim().min(3).max(4000)
});

export async function POST(request: Request) {
  try {
    const user = await requirePermission("sop:ask");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = askSchema.parse(raw);

    const redacted = redactProhibited(body.question);
    const questionHash = hashQuestion(redacted.redactedText);

    const result = await answerSopQuestion(user, body.question);

    if (result.outcome === "REJECTED_BY_FILTER") {
      throw new HttpError(422, result.errorMessage ?? "Question rejected by filter.", "rejected_by_filter");
    }

    const persisted = await persistSopQueryAndEscalation({
      user,
      redactedQuestion: redacted.redactedText,
      questionHash,
      result
    });

    return ok({
      queryId: persisted.queryId,
      outcome: result.outcome,
      answer: result.answerShown,
      citations: result.citations,
      escalation: persisted.escalation
        ? {
            id: persisted.escalation.id,
            routedToUserId: persisted.escalation.routedToUserId,
            reason: result.escalationReason,
            triggers: result.triggers
          }
        : null,
      confidence: result.confidence,
      redactionApplied: result.redactionApplied.classes
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
