import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, ok, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const resolveSchema = z.object({
  resolutionType: z.enum(["ANSWERED", "SOP_DRAFTED", "NO_ACTION", "REASSIGN"]),
  resolutionNotes: z.string().trim().min(3).max(4000),
  reassignToUserId: z.string().trim().min(1).optional(),
  draftDocumentId: z.string().trim().min(1).optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("sop:escalation:resolve");
    const body = resolveSchema.parse(await request.json());

    const escalation = await prisma.sopEscalation.findFirst({
      where: { id: params.id, organizationId: user.organizationId, archivedAt: null }
    });
    if (!escalation) {
      throw new HttpError(404, "Escalation not found.", "not_found");
    }
    if (escalation.routedToUserId && escalation.routedToUserId !== user.id && user.userLevel !== "ADMIN" && user.userLevel !== "DIRECTOR") {
      throw new HttpError(403, "This escalation is assigned to another manager.", "forbidden");
    }

    const now = new Date();
    const nextStatus =
      body.resolutionType === "ANSWERED"
        ? "RESOLVED_ANSWERED"
        : body.resolutionType === "SOP_DRAFTED"
          ? "RESOLVED_SOP_DRAFTED"
          : body.resolutionType === "NO_ACTION"
            ? "RESOLVED_NO_ACTION"
            : "REASSIGNED";

    const updated = await prisma.sopEscalation.update({
      where: { id: escalation.id },
      data: {
        status: nextStatus,
        resolvedById: nextStatus === "REASSIGNED" ? undefined : user.id,
        resolvedAt: nextStatus === "REASSIGNED" ? undefined : now,
        resolutionType: body.resolutionType,
        resolutionNotes: body.resolutionNotes,
        draftDocumentId: body.draftDocumentId,
        routedToUserId: nextStatus === "REASSIGNED" ? body.reassignToUserId ?? null : escalation.routedToUserId,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: `sop.escalation.${body.resolutionType.toLowerCase()}`,
      entityType: "sop_escalation",
      entityId: escalation.id,
      departmentId: escalation.departmentId,
      ownerId: escalation.ownerId,
      reason: body.resolutionNotes,
      before: { status: escalation.status, routedToUserId: escalation.routedToUserId },
      after: { status: updated.status, routedToUserId: updated.routedToUserId }
    });

    return ok({ escalation: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
