import { erpPurchaseOrderCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates, toDate } from "@/lib/erp-routes";
import { recordNumber } from "@/lib/numbering";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.purchaseOrders,
  entityType: "purchase_order",
  schema: erpPurchaseOrderCreateSchema,
  searchFields: ["poNumber"],
  defaultOrderBy: [{ expectedDate: "asc" }, { updatedAt: "desc" }],
  buildData: (body, user) => ({
    poNumber: body.poNumber ?? recordNumber("PO"),
    vendorId: body.vendorId,
    orderDate: toDate(body.orderDate),
    expectedDate: toDate(body.expectedDate),
    buyerId: body.buyerId ?? user.id,
    totalAmount: body.totalAmount,
    priority: body.priority,
    status: body.status,
    ownerId: body.buyerId ?? user.id,
    notes: body.notes
  })
});
