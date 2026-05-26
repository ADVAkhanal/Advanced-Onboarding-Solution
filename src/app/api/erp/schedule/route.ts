import { erpScheduleCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates, toDate } from "@/lib/erp-routes";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.schedule,
  entityType: "shop_schedule_item",
  schema: erpScheduleCreateSchema,
  departmentScoped: true,
  searchFields: ["workCenter"],
  defaultOrderBy: [{ scheduleDate: "asc" }, { updatedAt: "desc" }],
  buildData: (body, user) => ({
    workOrderId: body.workOrderId,
    operationId: body.operationId,
    workCenter: body.workCenter,
    scheduleDate: toDate(body.scheduleDate),
    startTime: toDate(body.startTime),
    endTime: toDate(body.endTime),
    priority: body.priority,
    status: body.status,
    departmentId: body.departmentId ?? user.departmentId,
    ownerId: body.ownerId ?? user.id
  })
});
