import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { recordNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { erpQuoteConvertSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/**
 * Convert a WON quote into a SalesOrder (the ERPNext / Odoo
 * quotation → sales-order pattern).
 *
 * Guardrails:
 * - Only WON quotes convert. A quote must be marked won before it can
 *   become an order — this keeps the pipeline honest.
 * - One order per quote. If a SalesOrder already references this quote,
 *   the endpoint refuses (409) rather than silently creating a duplicate.
 */
export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const user = await requirePermission("quote:submit");

    const raw = await request.json().catch(() => ({}));
    assertNoProhibitedFields(raw);
    const body = erpQuoteConvertSchema.parse(raw ?? {});

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
    if (quote.status !== "WON") {
      throw new HttpError(
        422,
        "Only a WON quote can be converted to a sales order. Mark the quote won first.",
        "invalid_state"
      );
    }

    const existing = await prisma.salesOrder.findFirst({
      where: { organizationId: user.organizationId, quoteId: quote.id, archivedAt: null }
    });
    if (existing) {
      throw new HttpError(
        409,
        `This quote is already converted to ${existing.orderNumber}.`,
        "already_converted"
      );
    }

    const lineCount = await prisma.quoteLine.count({
      where: { organizationId: user.organizationId, quoteId: quote.id, archivedAt: null }
    });
    const quoteTotal = quote.estimatedValue ? Number(quote.estimatedValue) : 0;
    const orderNumber = recordNumber("SO");

    const conversionNote = [
      `Converted from quote ${quote.quoteNumber}.`,
      `Quote total at conversion: $${quoteTotal.toFixed(2)} across ${lineCount} line(s).`,
      body.notes?.trim() ? body.notes.trim() : null
    ]
      .filter(Boolean)
      .join(" ");

    const order = await prisma.salesOrder.create({
      data: {
        organizationId: user.organizationId,
        orderNumber,
        customerId: quote.customerId,
        quoteId: quote.id,
        customerPoNumber: body.customerPoNumber?.trim() || undefined,
        promisedDate: body.promisedDate ? new Date(body.promisedDate) : quote.dueDate ?? undefined,
        priority: quote.priority,
        status: "OPEN",
        ownerId: quote.ownerId ?? user.id,
        notes: conversionNote,
        createdById: user.id,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "quote.convert.sales_order",
      entityType: "sales_order",
      entityId: order.id,
      ownerId: order.ownerId,
      after: { order, fromQuoteId: quote.id, fromQuoteNumber: quote.quoteNumber, quoteTotal },
      reason: `Converted from ${quote.quoteNumber}`
    });

    return ok({ order }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
