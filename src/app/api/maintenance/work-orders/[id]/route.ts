import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PRIORITY = ["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"] as const;

const schema = z.object({
  status: z.enum(["REQUESTED", "ASSIGNED", "IN_PROGRESS", "DONE"]).optional(),
  assignee: z.string().max(120).optional(),
  priority: z.enum(PRIORITY).optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(4000).optional()
});

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("maintenance:manage");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw);

    const existing = await prisma.maintenanceWorkOrder.findFirst({
      where: { id: context.params.id, organizationId: user.organizationId, archivedAt: null }
    });
    if (!existing) {
      throw new HttpError(404, "Work order not found.", "not_found");
    }

    const nowDone = body.status === "DONE";
    const wasDone = existing.status === "DONE";

    const updated = await prisma.maintenanceWorkOrder.update({
      where: { id: existing.id },
      data: {
        updatedById: user.id,
        status: body.status ?? existing.status,
        assignee: body.assignee ?? existing.assignee,
        priority: body.priority ?? existing.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : existing.dueDate,
        notes: body.notes ?? existing.notes,
        closedAt: nowDone ? existing.closedAt ?? new Date() : wasDone && body.status ? null : existing.closedAt
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "maintenance_work_order.update",
      entityType: "maintenance_work_order",
      entityId: updated.id,
      before: existing,
      after: updated
    });
    return ok({ record: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
