import { erpQualityInspectionCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates, toDate } from "@/lib/erp-routes";
import { recordNumber } from "@/lib/numbering";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.qualityInspections,
  entityType: "quality_inspection",
  schema: erpQualityInspectionCreateSchema,
  departmentScoped: true,
  searchFields: ["inspectionNumber", "inspectionType", "result"],
  defaultOrderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
  buildData: (body, user) => ({
    inspectionNumber: body.inspectionNumber ?? recordNumber("QI"),
    workOrderId: body.workOrderId,
    partId: body.partId,
    inspectionType: body.inspectionType,
    result: body.result,
    inspectorId: body.inspectorId ?? user.id,
    dueDate: toDate(body.dueDate),
    completedAt: toDate(body.completedAt),
    priority: body.priority,
    status: body.status,
    departmentId: body.departmentId ?? user.departmentId,
    ownerId: body.ownerId ?? body.inspectorId ?? user.id,
    notes: body.notes
  })
});
