import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { erpCycleTimeLookupSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("cycletime:manage");

    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = erpCycleTimeLookupSchema.parse(raw);

    // Upsert against the bucket unique key — managers maintain one row
    // per (org, material, process, complexity, diameter) bucket, refining
    // estimates over time rather than accumulating duplicates.
    const lookup = await prisma.cycleTimeLookup.upsert({
      where: {
        organizationId_materialCategory_process_complexityClass_diameterClass: {
          organizationId: user.organizationId,
          materialCategory: body.materialCategory,
          process: body.process,
          complexityClass: body.complexityClass,
          diameterClass: body.diameterClass
        }
      },
      create: {
        organizationId: user.organizationId,
        materialCategory: body.materialCategory,
        process: body.process,
        complexityClass: body.complexityClass,
        diameterClass: body.diameterClass,
        estimatedSetupHours: body.estimatedSetupHours,
        estimatedCycleMinutes: body.estimatedCycleMinutes,
        sampleSize: body.sampleSize ?? 0,
        confidenceScore: body.confidenceScore,
        lastReviewedAt: new Date(),
        reviewedById: user.id,
        notes: body.notes,
        createdById: user.id,
        updatedById: user.id
      },
      update: {
        estimatedSetupHours: body.estimatedSetupHours,
        estimatedCycleMinutes: body.estimatedCycleMinutes,
        sampleSize: body.sampleSize ?? undefined,
        confidenceScore: body.confidenceScore,
        lastReviewedAt: new Date(),
        reviewedById: user.id,
        notes: body.notes,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "cycletime.upsert",
      entityType: "cycle_time_lookup",
      entityId: lookup.id,
      after: lookup
    });

    return ok({ lookup }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
