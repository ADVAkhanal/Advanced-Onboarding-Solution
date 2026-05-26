import { erpReceiptCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates, toDate } from "@/lib/erp-routes";
import { recordNumber } from "@/lib/numbering";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.receipts,
  entityType: "receipt",
  schema: erpReceiptCreateSchema,
  searchFields: ["receiptNumber"],
  defaultOrderBy: [{ receivedDate: "desc" }],
  buildData: (body, user) => ({
    receiptNumber: body.receiptNumber ?? recordNumber("RCV"),
    purchaseOrderId: body.purchaseOrderId,
    vendorId: body.vendorId,
    receivedDate: toDate(body.receivedDate),
    status: body.status,
    ownerId: user.id,
    notes: body.notes
  })
});
