import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { type CycleBucket, deriveOperationActual, recomputeLookupFromActuals } from "@/lib/job-actuals";
import { prisma } from "@/lib/prisma";
import { erpOperationCompleteSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/**
 * Complete a work-order operation and (when possible) feed the cycle-time
 * loop: record actuals on the operation, and if the work order's part has
 * a full manufacturing bucket, create a JobActual and recompute the
 * matching cycle-time lookup as DERIVED — all in one transaction.
 */
export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("erp:manage");

    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = erpOperationCompleteSchema.parse(raw);

    const operation = await prisma.workOrderOperation.findFirst({
      where: { id: context.params.id, organizationId: user.organizationId, archivedAt: null }
    });
    if (!operation) {
      throw new HttpError(404, "Operation not found.", "not_found");
    }

    // Resolve the work order's part to derive the cycle-time bucket.
    const workOrder = operation.workOrderId
      ? await prisma.workOrder.findFirst({
          where: { id: operation.workOrderId, organizationId: user.organizationId },
          select: { id: true, partId: true }
        })
      : null;
    const part = workOrder?.partId
      ? await prisma.part.findFirst({
          where: { id: workOrder.partId, organizationId: user.organizationId },
          select: { id: true, materialCategory: true, primaryProcess: true, complexityClass: true, diameterClass: true }
        })
      : null;

    const completedAt = body.completedAt ? new Date(body.completedAt) : new Date();
    const derived = deriveOperationActual({
      actualSetupHours: body.actualSetupHours,
      actualRunHours: body.actualRunHours,
      completedQuantity: body.completedQuantity
    });

    // A JobActual can only be created when the part carries a full bucket.
    const bucket: CycleBucket | null =
      part && part.materialCategory && part.primaryProcess && part.complexityClass
        ? {
            materialCategory: part.materialCategory,
            process: part.primaryProcess,
            complexityClass: part.complexityClass,
            diameterClass: part.diameterClass ?? "NOT_APPLICABLE"
          }
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const updatedOp = await tx.workOrderOperation.update({
        where: { id: operation.id },
        data: {
          status: "COMPLETE",
          actualSetupHours: body.actualSetupHours,
          actualRunHours: body.actualRunHours,
          completedQuantity: body.completedQuantity,
          completedAt,
          updatedById: user.id
        }
      });

      let jobActualId: string | null = null;
      let lookupId: string | null = null;

      if (bucket && derived) {
        const jobActual = await tx.jobActual.create({
          data: {
            organizationId: user.organizationId,
            partId: part?.id,
            workOrderId: workOrder?.id,
            ...bucket,
            quantity: Math.round(body.completedQuantity),
            actualSetupHours: derived.setupHours,
            actualCycleMinutesPerPiece: derived.cycleMinutesPerPiece,
            completedAt,
            notes: body.notes,
            createdById: user.id
          }
        });
        jobActualId = jobActual.id;
        const lookup = await recomputeLookupFromActuals(tx, user.organizationId, bucket, user.id);
        lookupId = lookup?.id ?? null;
      }

      return { updatedOp, jobActualId, lookupId };
    });

    // Reason explains whether the loop was fed, so the audit trail is clear.
    const fedLoop = Boolean(result.jobActualId);
    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "operation.complete",
      entityType: "work_order_operation",
      entityId: operation.id,
      ownerId: operation.ownerId,
      reason: fedLoop
        ? "Operation completed; cycle-time estimate refreshed from actuals."
        : "Operation completed; no part bucket, cycle-time estimate not updated.",
      after: {
        operation: result.updatedOp,
        jobActualId: result.jobActualId,
        recomputedLookupId: result.lookupId
      }
    });

    return ok(
      { operation: result.updatedOp, fedCycleTimeLoop: fedLoop, jobActualId: result.jobActualId },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
