import type {
  ComplexityClass,
  DiameterClass,
  ManufacturingProcess,
  MaterialCategory,
  Prisma
} from "@prisma/client";
import { aggregateActuals } from "./cycle-time-aggregation";

export type CycleBucket = {
  materialCategory: MaterialCategory;
  process: ManufacturingProcess;
  complexityClass: ComplexityClass;
  diameterClass: DiameterClass;
};

/**
 * Recompute the CycleTimeLookup for a bucket from all non-excluded,
 * non-archived JobActuals in that bucket, and upsert it as DERIVED.
 *
 * Accepts a Prisma.TransactionClient so the caller can run it inside the
 * same transaction that created the triggering JobActual — the actual and
 * the recomputed lookup then commit atomically. Returns the upserted
 * lookup, or null when there are no usable actuals (lookup left untouched).
 *
 * Kept out of the route file because Next.js route modules may only export
 * HTTP handlers + config; this is shared by the record endpoint and any
 * future batch importer.
 */
export async function recomputeLookupFromActuals(
  tx: Prisma.TransactionClient,
  organizationId: string,
  bucket: CycleBucket,
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
