import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  machineId: z.string().min(1),
  title: z.string().min(1).max(200),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annual"]).optional(),
  estMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  nextDueAt: z.string().optional()
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

    const created = await prisma.pmTask.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        updatedById: user.id,
        machineId: machine.id,
        title: body.title,
        frequency: body.frequency ?? "monthly",
        estMinutes: body.estMinutes ?? 30,
        nextDueAt: body.nextDueAt ? new Date(body.nextDueAt) : new Date()
      }
    });
    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "pm_task.create",
      entityType: "pm_task",
      entityId: created.id,
      after: created
    });
    return ok({ record: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
