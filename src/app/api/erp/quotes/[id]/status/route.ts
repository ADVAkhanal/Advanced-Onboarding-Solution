import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { erpQuoteStatusTransitionSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Status state machine. Keep narrow — the more transitions you allow,
// the harder it is to trust the queue counts.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["QUOTED", "ON_HOLD"],
  QUOTED: ["WON", "LOST", "ON_HOLD", "EXPIRED", "DRAFT"],
  ON_HOLD: ["DRAFT", "QUOTED", "LOST"],
  WON: [], // terminal
  LOST: [], // terminal
  EXPIRED: ["DRAFT"] // can re-open as a fresh draft
};

// Submitting a quote to a customer (WON included since it implies the
// quote was sent) requires quote:submit. Internal-only transitions
// (DRAFT, ON_HOLD, EXPIRED) only require quote:price.
const SUBMIT_TRANSITIONS = new Set(["QUOTED", "WON", "LOST"]);

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Permission is determined by the target status. Pull the priced
    // baseline check first; escalate if the transition requires submit.
    const user = await requirePermission("quote:price");

    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = erpQuoteStatusTransitionSchema.parse(raw);

    if (SUBMIT_TRANSITIONS.has(body.status) && !user.permissions.includes("quote:submit")) {
      throw new HttpError(
        403,
        "Only directors and above can move a quote to QUOTED, WON, or LOST.",
        "forbidden"
      );
    }

    const quote = await prisma.quote.findFirst({
      where: {
        id: context.params.id,
        organizationId: user.organizationId,
        archivedAt: null
      }
    });
    if (!quote) {
      throw new HttpError(404, "Quote not found.", "not_found");
    }

    const allowed = ALLOWED_TRANSITIONS[quote.status] ?? [];
    if (!allowed.includes(body.status)) {
      throw new HttpError(
        422,
        `Cannot move a ${quote.status} quote to ${body.status}.`,
        "invalid_transition"
      );
    }

    const before = { status: quote.status };
    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: body.status,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: `quote.status.${body.status.toLowerCase()}`,
      entityType: "quote",
      entityId: updated.id,
      ownerId: updated.ownerId,
      before,
      after: { status: updated.status },
      reason: body.reason
    });

    return ok({ quote: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
