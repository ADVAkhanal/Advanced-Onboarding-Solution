import { erpQuoteCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates, toDate } from "@/lib/erp-routes";
import { recordNumber } from "@/lib/numbering";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.quotes,
  entityType: "quote",
  schema: erpQuoteCreateSchema,
  searchFields: ["quoteNumber", "title"],
  defaultOrderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
  buildData: (body, user) => ({
    quoteNumber: body.quoteNumber ?? recordNumber("QTE"),
    customerId: body.customerId,
    title: body.title,
    priority: body.priority,
    status: body.status,
    dueDate: toDate(body.dueDate),
    estimatedValue: body.estimatedValue,
    marginTarget: body.marginTarget,
    validUntil: toDate(body.validUntil),
    ownerId: body.ownerId ?? user.id,
    notes: body.notes
  })
});
