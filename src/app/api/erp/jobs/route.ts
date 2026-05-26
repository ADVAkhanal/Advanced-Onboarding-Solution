import { erpWorkOrderCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates, toDate } from "@/lib/erp-routes";
import { recordNumber } from "@/lib/numbering";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.workOrders,
  entityType: "work_order",
  schema: erpWorkOrderCreateSchema,
  departmentScoped: true,
  searchFields: ["workOrderNumber", "title"],
  defaultOrderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
  buildData: (body, user) => ({
    workOrderNumber: body.workOrderNumber ?? recordNumber("WO"),
    salesOrderId: body.salesOrderId,
    customerId: body.customerId,
    partId: body.partId,
    departmentId: body.departmentId ?? user.departmentId,
    title: body.title,
    quantity: body.quantity,
    releasedQuantity: body.releasedQuantity,
    dueDate: toDate(body.dueDate),
    priority: body.priority,
    status: body.status,
    routerStatus: body.routerStatus,
    materialStatus: body.materialStatus,
    qualityStatus: body.qualityStatus,
    shippingStatus: body.shippingStatus,
    ownerId: body.ownerId ?? user.id,
    notes: body.notes
  })
});
