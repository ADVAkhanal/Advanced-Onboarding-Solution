import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { advanceDueDate } from "@/lib/maintenance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  notes: z.string().max(2000).optional()
});

/**
 * Check off a PM: append an immutable PmCompletion record, stamp lastDoneAt,
 * and roll nextDueAt forward by one cycle of the task's frequency.
 */
export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("maintenance:manage");
    const raw = await request.json().catch(() => ({}));
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw ?? {});

    const pm = await prisma.pmTask.findFirst({
      where: { id: context.params.id, organizationId: user.organizationId, archivedAt: null }
    });
    if (!pm) {
      throw new HttpError(404, "PM task not found.", "not_found");
    }

    const now = new Date();
    const completion = await prisma.pmCompletion.create({
      data: {
        organizationId: user.organizationId,
        pmTaskId: pm.id,
        machineId: pm.machineId,
        title: pm.title,
        completedAt: now,
        completedById: user.id,
        notes: body.notes
      }
    });

    const updated = await prisma.pmTask.update({
      where: { id: pm.id },
      data: { updatedById: user.id, lastDoneAt: now, nextDueAt: advanceDueDate(now, pm.frequency) }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "pm_task.complete",
      entityType: "pm_task",
      entityId: pm.id,
      after: { completionId: completion.id, nextDueAt: updated.nextDueAt }
    });

    return ok({ record: updated, completionId: completion.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
