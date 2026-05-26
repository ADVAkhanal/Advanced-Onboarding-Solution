import { erpTimeEntryCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates, toDate } from "@/lib/erp-routes";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.timeEntries,
  entityType: "time_entry",
  schema: erpTimeEntryCreateSchema,
  allowUserList: true,
  allowUserCreate: true,
  ownershipField: "userId",
  departmentScoped: true,
  defaultOrderBy: [{ entryDate: "desc" }, { updatedAt: "desc" }],
  buildData: (body, user) => ({
    userId: user.userLevel === "USER" ? user.id : body.userId ?? user.id,
    workOrderId: body.workOrderId,
    operationId: body.operationId,
    entryDate: toDate(body.entryDate),
    hours: body.hours,
    entryType: body.entryType,
    status: body.status,
    departmentId: body.departmentId ?? user.departmentId,
    ownerId: body.ownerId ?? user.id,
    notes: body.notes
  })
});
