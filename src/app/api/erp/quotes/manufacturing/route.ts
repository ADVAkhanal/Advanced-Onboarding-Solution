import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok } from "@/lib/http";
import { recordNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { estimateLine, findCycleTimeLookup } from "@/lib/quoting";
import { erpManufacturingQuoteCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("quote:create");

    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = erpManufacturingQuoteCreateSchema.parse(raw);

    // Optional cycle-time lookup. If the operator did not pre-select a
    // lookup row, try to find one matching the (material, process,
    // complexity, diameter) bucket. Operator-entered values still take
    // precedence over the lookup defaults — the lookup is a hint, not
    // a source of truth.
    const lookup = body.cycleTimeLookupId
      ? await prisma.cycleTimeLookup.findFirst({
          where: { id: body.cycleTimeLookupId, organizationId: user.organizationId }
        })
      : await findCycleTimeLookup(user.organizationId, {
          materialCategory: body.materialCategory,
          process: body.process,
          complexityClass: body.complexityClass,
          diameterClass: body.diameterClass
        });

    const setupHours = body.setupHours ?? (lookup ? Number(lookup.estimatedSetupHours) : 0);
    const cycleMinutesPerPiece =
      body.cycleMinutesPerPiece ?? (lookup ? Number(lookup.estimatedCycleMinutes) : 0);
    const materialCostPerUnit = body.materialCostPerUnit ?? 0;
    const laborRatePerHour = body.laborRatePerHour ?? 0;
    const burdenRatePerHour = body.burdenRatePerHour ?? 0;
    const marginPercent = body.marginPercent ?? 0;
    const quantity = body.quantity;

    const estimate = estimateLine({
      quantity,
      setupHours,
      cycleMinutesPerPiece,
      materialCostPerUnit,
      laborRatePerHour,
      burdenRatePerHour,
      marginPercent
    });

    const quoteNumber = recordNumber("QTE");

    const { quote, line } = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          organizationId: user.organizationId,
          quoteNumber,
          customerId: body.customerId,
          title: body.title,
          status: "DRAFT",
          priority: body.priority,
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
          validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
          estimatedValue: estimate.total,
          marginTarget: marginPercent || undefined,
          ownerId: user.id,
          notes: body.notes,
          createdById: user.id,
          updatedById: user.id
        }
      });

      const line = await tx.quoteLine.create({
        data: {
          organizationId: user.organizationId,
          quoteId: quote.id,
          description: body.partDescription,
          quantity,
          unitPrice: estimate.unitPrice,
          estimatedHours: estimate.totalHours,
          materialCategory: body.materialCategory,
          process: body.process,
          complexityClass: body.complexityClass,
          diameterClass: body.diameterClass,
          setupHours,
          cycleMinutesPerPiece,
          materialCostPerUnit,
          laborRatePerHour,
          burdenRatePerHour,
          marginPercent: marginPercent || undefined,
          cycleTimeLookupId: lookup?.id,
          routingNotes: body.routingNotes,
          ownerId: user.id,
          createdById: user.id,
          updatedById: user.id
        }
      });

      return { quote, line };
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "quote.create.manufacturing",
      entityType: "quote",
      entityId: quote.id,
      ownerId: quote.ownerId,
      after: { quote, line, estimate, usedLookupId: lookup?.id ?? null }
    });

    return ok({ quote, line, estimate, usedLookupId: lookup?.id ?? null }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
