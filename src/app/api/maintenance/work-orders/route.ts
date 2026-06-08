import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok } from "@/lib/http";
import { recordNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PRIORITY = ["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"] as const;

const schema = z.object({
  title: z.string().min(1).max(200),
  machineId: z.string().max(40).optional(),
  priority: z.enum(PRIORITY).optional(),
  description: z.string().max(4000).optional(),
  requestedByName: z.string().max(120).optional(),
  requestedByDept: z.string().max(120).optional(),
  assignee: z.string().max(120).optional(),
  dueDate: z.string().optional(),
  source: z.enum(["internal", "public"]).optional()
});

// maintenance:view can report an issue (create a request); manage handles triage.
export async function POST(request: Request) {
  try {
    const user = await requirePermission("maintenance:view");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw);

    const created = await prisma.maintenanceWorkOrder.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        updatedById: user.id,
        ownerId: user.id,
        woNumber: recordNumber("MWO"),
        title: body.title,
        machineId: body.machineId || null,
        priority: body.priority ?? "NORMAL",
        status: "REQUESTED",
        description: body.description,
        requestedByName: body.requestedByName ?? `${user.firstName} ${user.lastName}`,
        requestedByDept: body.requestedByDept,
        assignee: body.assignee,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        source: body.source ?? "internal"
      }
    });
    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "maintenance_work_order.create",
      entityType: "maintenance_work_order",
      entityId: created.id,
      after: created
    });
    return ok({ record: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
