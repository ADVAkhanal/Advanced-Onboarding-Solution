import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { estimateLine, findCycleTimeLookup } from "@/lib/quoting";
import { erpQuoteLineCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const user = await requirePermission("quote:price");

    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = erpQuoteLineCreateSchema.parse(raw);

    const quote = await prisma.quote.findFirst({
      where: {
        id: context.params.id,
        organizationId: user.organizationId,
        archivedAt: null
      }
    });
    if (!quote) {
      throw new HttpError(404, "Quote not found.", "not_found");
    }
    if (quote.status === "WON" || quote.status === "LOST") {
      throw new HttpError(
        422,
        "Cannot add lines to a quote in a terminal status. Re-open or clone first.",
        "invalid_state"
      );
    }

    // Cycle-time lookup, same precedence as the intake form: operator
    // override beats matched lookup beats zero.
    const lookup = body.cycleTimeLookupId
      ? await prisma.cycleTimeLookup.findFirst({
          where: {
            id: body.cycleTimeLookupId,
            organizationId: user.organizationId
          }
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

    const estimate = estimateLine({
      quantity: body.quantity,
      setupHours,
      cycleMinutesPerPiece,
      materialCostPerUnit,
      laborRatePerHour,
      burdenRatePerHour,
      marginPercent
    });

    const { line, updatedQuote } = await prisma.$transaction(async (tx) => {
      const line = await tx.quoteLine.create({
        data: {
          organizationId: user.organizationId,
          quoteId: quote.id,
          description: body.partDescription,
          quantity: body.quantity,
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

      // Re-aggregate the quote's estimatedValue from all live lines so
      // the header total stays in sync as lines are added.
      const allLines = await tx.quoteLine.findMany({
        where: {
          organizationId: user.organizationId,
          quoteId: quote.id,
          archivedAt: null
        },
        select: { quantity: true, unitPrice: true }
      });
      const newTotal = allLines.reduce((sum, row) => {
        const qty = Number(row.quantity);
        const unit = row.unitPrice ? Number(row.unitPrice) : 0;
        return sum + qty * unit;
      }, 0);

      const updatedQuote = await tx.quote.update({
        where: { id: quote.id },
        data: {
          estimatedValue: Math.round(newTotal * 100) / 100,
          updatedById: user.id
        }
      });

      return { line, updatedQuote };
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "quote.line.create",
      entityType: "quote_line",
      entityId: line.id,
      ownerId: line.ownerId,
      after: { line, estimate, usedLookupId: lookup?.id ?? null }
    });

    return ok({ line, quote: updatedQuote, estimate }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
