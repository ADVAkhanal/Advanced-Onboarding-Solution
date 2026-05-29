import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok } from "@/lib/http";
import { type CycleBucket, recomputeLookupFromActuals } from "@/lib/job-actuals";
import { prisma } from "@/lib/prisma";
import { erpJobActualCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("jobactual:record");

    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = erpJobActualCreateSchema.parse(raw);

    const bucket: CycleBucket = {
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
