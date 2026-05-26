import { erpOperationCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates, toDate } from "@/lib/erp-routes";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.operations,
  entityType: "work_order_operation",
  schema: erpOperationCreateSchema,
  departmentScoped: true,
  searchFields: ["workCenter", "description"],
  defaultOrderBy: [{ operationNumber: "asc" }, { updatedAt: "desc" }],
  buildData: (body, user) => ({
    workOrderId: body.workOrderId,
    operationNumber: body.operationNumber,
    workCenter: body.workCenter,
    description: body.description,
    setupHours: body.setupHours,
    runHours: body.runHours,
    status: body.status,
    scheduledStart: toDate(body.scheduledStart),
    scheduledEnd: toDate(body.scheduledEnd),
    assignedToId: body.assignedToId,
    departmentId: body.departmentId ?? user.departmentId,
    ownerId: body.ownerId ?? body.assignedToId ?? user.id
  })
});
