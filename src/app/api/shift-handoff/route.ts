import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { pushoverStatus, sendPushoverAlert } from "@/lib/pushover";

export const dynamic = "force-dynamic";

const entrySchema = z.object({
  machineCode: z.string().min(1).max(120),
  woNumber: z.string().max(60).optional(),
  status: z.enum(["RUNNING", "DOWN", "SETUP", "IDLE", "COMPLETE"]),
  partsMade: z.coerce.number().int().min(0).max(1_000_000).optional(),
  partsTarget: z.coerce.number().int().min(0).max(1_000_000).optional(),
  notes: z.string().max(2000).optional()
});

const schema = z.object({
  shift: z.enum(["DAY", "EVENING", "NIGHT"]),
  shiftDate: z.string().min(1),
  operators: z.string().max(400).optional(),
  notes: z.string().max(4000).optional(),
  entries: z.array(entrySchema).min(1).max(60)
});

// End-of-shift handoff is a shop-floor action — any ERP user can submit one.
export async function POST(request: Request) {
  try {
    const user = await requirePermission("erp:view");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw);

    const handoff = await prisma.$transaction(async (tx) => {
      const created = await tx.shiftHandoff.create({
        data: {
          organizationId: user.organizationId,
          createdById: user.id,
          updatedById: user.id,
          ownerId: user.id,
          departmentId: user.departmentId,
          shift: body.shift,
          shiftDate: new Date(`${body.shiftDate}T00:00:00`),
          operators: body.operators,
          notes: body.notes,
          submittedByName: `${user.firstName} ${user.lastName}`
        }
      });
      await tx.shiftHandoffEntry.createMany({
        data: body.entries.map((e) => ({
          organizationId: user.organizationId,
          handoffId: created.id,
          machineCode: e.machineCode,
          woNumber: e.woNumber,
          status: e.status,
          partsMade: e.partsMade,
          partsTarget: e.partsTarget,
          notes: e.notes,
          departmentId: user.departmentId,
          ownerId: user.id
        }))
      });

      // Cross-module sync: the handoff is an authoritative shop-floor report,
      // so DOWN / RUNNING flow into the maintenance Machine status (matched by
      // code). SETUP / IDLE / COMPLETE are production states, not maintenance
      // states — they leave the machine record alone.
      const downCodes = body.entries.filter((e) => e.status === "DOWN").map((e) => e.machineCode);
      const runningCodes = body.entries.filter((e) => e.status === "RUNNING").map((e) => e.machineCode);
      if (downCodes.length) {
        await tx.machine.updateMany({
          where: { organizationId: user.organizationId, code: { in: downCodes }, archivedAt: null },
          data: { status: "down", updatedById: user.id }
        });
      }
      if (runningCodes.length) {
        await tx.machine.updateMany({
          where: { organizationId: user.organizationId, code: { in: runningCodes }, archivedAt: null, status: "down" },
          data: { status: "running", updatedById: user.id }
        });
      }

      return created;
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "shift_handoff.create",
      entityType: "shift_handoff",
      entityId: handoff.id,
      after: { ...handoff, entryCount: body.entries.length }
    });

    // Supervisor alert (replaces the source app's Outlook/Teams notify).
    // Env-gated; logged to NotificationLog either way inside sendPushoverAlert.
    if (pushoverStatus().enabled) {
      const down = body.entries.filter((e) => e.status === "DOWN");
      await sendPushoverAlert({
        organizationId: user.organizationId,
        eventType: "shift_handoff.submitted",
        title: `Shift handoff — ${body.shift} ${body.shiftDate}`,
        message:
          `${handoff.submittedByName} submitted ${body.entries.length} machine entr${body.entries.length === 1 ? "y" : "ies"}.` +
          (down.length ? ` ⚠ DOWN: ${down.map((e) => e.machineCode).join(", ")}.` : " No machines down."),
        departmentId: user.departmentId,
        ownerId: user.id,
        createdById: user.id
      });
    }

    return ok({ record: handoff }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
