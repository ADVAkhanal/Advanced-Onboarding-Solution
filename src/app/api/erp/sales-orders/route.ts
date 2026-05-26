import { erpSalesOrderCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates, toDate } from "@/lib/erp-routes";
import { recordNumber } from "@/lib/numbering";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.salesOrders,
  entityType: "sales_order",
  schema: erpSalesOrderCreateSchema,
  searchFields: ["orderNumber", "customerPoNumber"],
  defaultOrderBy: [{ promisedDate: "asc" }, { updatedAt: "desc" }],
  buildData: (body, user) => ({
    orderNumber: body.orderNumber ?? recordNumber("SO"),
    customerId: body.customerId,
    quoteId: body.quoteId,
    customerPoNumber: body.customerPoNumber,
    promisedDate: toDate(body.promisedDate),
    priority: body.priority,
    status: body.status,
    ownerId: body.ownerId ?? user.id,
    notes: body.notes
  })
});
