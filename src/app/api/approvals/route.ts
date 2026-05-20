import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, ok } from "@/lib/http";
import { recordNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { sendPushoverAlert } from "@/lib/pushover";
import { approvalCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePermission("approval:view");
    const approvals = await prisma.approvalRequest.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...departmentScopeForUser(user)
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 100
    });

    return ok({ approvals });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("approval:view");
    const body = approvalCreateSchema.parse(await request.json());
    const created = await prisma.approvalRequest.create({
      data: {
        organizationId: user.organizationId,
        requestNumber: recordNumber("APR"),
        approvalType: body.approvalType,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        departmentId: body.departmentId,
        requesterId: user.id,
        ownerId: body.ownerId,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        summary: body.summary,
        createdById: user.id,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "approval.create",
      entityType: "approval_request",
      entityId: created.id,
      departmentId: created.departmentId,
      ownerId: created.ownerId,
      after: created
    });

    await sendPushoverAlert({
      organizationId: user.organizationId,
      eventType: "approval_request_created",
      title: "Approval request created",
      message: `${created.requestNumber}: ${created.approvalType}`,
      departmentId: created.departmentId,
      ownerId: created.ownerId,
      createdById: user.id
    });

    return ok({ approval: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
