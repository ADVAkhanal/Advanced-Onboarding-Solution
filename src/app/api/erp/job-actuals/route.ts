import type {
  ComplexityClass,
  DiameterClass,
  ManufacturingProcess,
  MaterialCategory,
  Prisma
} from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { aggregateActuals } from "@/lib/cycle-time-aggregation";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { erpJobActualCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

type TxClient = Prisma.TransactionClient;

type Bucket = {
  materialCategory: MaterialCategory;
  process: ManufacturingProcess;
  complexityClass: ComplexityClass;
  diameterClass: DiameterClass;
};

/**
 * Recompute the CycleTimeLookup for a bucket from all non-excluded,
 * non-archived JobActuals in that bucket, and upsert it as DERIVED.
 *
 * Runs inside the caller's transaction so the actual and the recomputed
 * lookup commit atomically. Returns the upserted lookup, or null when
 * there are no usable actuals (lookup left untouched).
 */
export async function recomputeLookupFromActuals(
  tx: TxClient,
  organizationId: string,
  bucket: Bucket,
  actorId: string
) {
  const actuals = await tx.jobActual.findMany({
    where: {
      organizationId,
      archivedAt: null,
      excludedFromAggregation: false,
      ...bucket
    },
    select: {
      quantity: true,
      actualSetupHours: true,
      actualCycleMinutesPerPiece: true
    }
  });

  const aggregate = aggregateActuals(
    actuals.map((a) => ({
      quantity: a.quantity,
      actualSetupHours: Number(a.actualSetupHours),
      actualCycleMinutesPerPiece: Number(a.actualCycleMinutesPerPiece)
    }))
  );

  if (!aggregate) {
    return null;
  }

  return tx.cycleTimeLookup.upsert({
    where: {
      organizationId_materialCategory_process_complexityClass_diameterClass: {
        organizationId,
        ...bucket
      }
    },
    create: {
      organizationId,
      ...bucket,
      estimatedSetupHours: aggregate.estimatedSetupHours,
      estimatedCycleMinutes: aggregate.estimatedCycleMinutes,
      sampleSize: aggregate.sampleSize,
      confidenceScore: aggregate.confidenceScore,
      source: "DERIVED",
      lastReviewedAt: new Date(),
      reviewedById: actorId,
      createdById: actorId,
      updatedById: actorId
    },
    update: {
      estimatedSetupHours: aggregate.estimatedSetupHours,
      estimatedCycleMinutes: aggregate.estimatedCycleMinutes,
      sampleSize: aggregate.sampleSize,
      confidenceScore: aggregate.confidenceScore,
      source: "DERIVED",
      lastReviewedAt: new Date(),
      reviewedById: actorId,
      updatedById: actorId
    }
  });
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("jobactual:record");

    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = erpJobActualCreateSchema.parse(raw);

    const bucket: Bucket = {
      materialCategory: body.materialCategory,
      process: body.process,
      complexityClass: body.complexityClass,
      diameterClass: body.diameterClass
    };

    const { actual, lookup } = await prisma.$transaction(async (tx) => {
      const actual = await tx.jobActual.create({
        data: {
          organizationId: user.organizationId,
          partId: body.partId,
          workOrderId: body.workOrderId,
          ...bucket,
          quantity: body.quantity,
          actualSetupHours: body.actualSetupHours,
          actualCycleMinutesPerPiece: body.actualCycleMinutesPerPiece,
          completedAt: new Date(body.completedAt),
          notes: body.notes,
          createdById: user.id
        }
      });

      // The loop: every recorded actual refreshes the bucket's estimate.
      const lookup = await recomputeLookupFromActuals(tx, user.organizationId, bucket, user.id);

      return { actual, lookup };
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "jobactual.record",
      entityType: "job_actual",
      entityId: actual.id,
      after: {
        actual,
        recomputedLookup: lookup
          ? {
              id: lookup.id,
              estimatedSetupHours: lookup.estimatedSetupHours,
              estimatedCycleMinutes: lookup.estimatedCycleMinutes,
              sampleSize: lookup.sampleSize,
              confidenceScore: lookup.confidenceScore,
              source: lookup.source
            }
          : null
      }
    });

    return ok({ actual, lookup }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
