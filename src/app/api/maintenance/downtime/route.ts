import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  machineId: z.string().min(1),
  startAt: z.string().min(1),
  hours: z.coerce.number().min(0).max(10000).optional(),
  reason: z.string().max(300).optional(),
  rootCause: z.string().max(300).optional(),
  resolution: z.string().max(300).optional()
});

export async function POST(request: Request) {
  try {
    const user = await requirePermission("maintenance:manage");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw);

    const machine = await prisma.machine.findFirst({
      where: { id: body.machineId, organizationId: user.organizationId, archivedAt: null },
      select: { id: true }
    });
    if (!machine) {
      throw new HttpError(404, "Machine not found.", "not_found");
    }

    const created = await prisma.maintenanceDowntimeEvent.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        updatedById: user.id,
        machineId: machine.id,
        startAt: new Date(body.startAt),
        hours: body.hours,
        reason: body.reason,
        rootCause: body.rootCause,
        resolution: body.resolution
      }
    });
    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "maintenance_downtime.create",
      entityType: "maintenance_downtime_event",
      entityId: created.id,
      after: created
    });
    return ok({ record: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
