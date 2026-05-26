import { erpShipmentCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates, toDate } from "@/lib/erp-routes";
import { recordNumber } from "@/lib/numbering";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.shipments,
  entityType: "shipment",
  schema: erpShipmentCreateSchema,
  searchFields: ["shipmentNumber", "carrierName", "trackingNumber"],
  defaultOrderBy: [{ shipDate: "asc" }, { updatedAt: "desc" }],
  buildData: (body, user) => ({
    shipmentNumber: body.shipmentNumber ?? recordNumber("SHP"),
    customerId: body.customerId,
    salesOrderId: body.salesOrderId,
    workOrderId: body.workOrderId,
    carrierName: body.carrierName,
    trackingNumber: body.trackingNumber,
    shipDate: toDate(body.shipDate),
    priority: body.priority,
    status: body.status,
    ownerId: user.id,
    notes: body.notes
  })
});
