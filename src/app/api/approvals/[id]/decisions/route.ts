import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  decision: z.enum(["Approved", "Rejected", "Needs More Info", "Escalated", "Cancelled"]),
  reason: z.string().trim().min(3).max(2000)
});

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("approval:decide");
    const body = decisionSchema.parse(await request.json());
    const approval = await prisma.approvalRequest.findFirst({
      where: { id: context.params.id, organizationId: user.organizationId, archivedAt: null }
    });

    if (!approval) {
      throw new HttpError(404, "Approval request not found.", "not_found");
    }

    if (approval.requesterId === user.id) {
      throw new HttpError(403, "Self-approval is blocked for approval requests.", "self_approval_blocked");
    }

    const decision = await prisma.$transaction(async (tx) => {
      const created = await tx.approvalDecision.create({
        data: {
          organizationId: user.organizationId,
          approvalRequestId: approval.id,
          decidedById: user.id,
          decision: body.decision,
          reason: body.reason,
          departmentId: approval.departmentId,
          ownerId: approval.ownerId,
          createdById: user.id
        }
      });

      await tx.approvalRequest.update({
        where: { id: approval.id },
        data: { status: body.decision, updatedById: user.id }
      });

      return created;
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "approval.decide",
      entityType: "approval_request",
      entityId: approval.id,
      departmentId: approval.departmentId,
      ownerId: approval.ownerId,
      reason: body.reason,
      before: approval,
      after: decision
    });

    return ok({ decision });
  } catch (error) {
    return handleRouteError(error);
  }
}
