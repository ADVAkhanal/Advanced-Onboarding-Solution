import { erpNonconformanceCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates } from "@/lib/erp-routes";
import { recordNumber } from "@/lib/numbering";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.nonconformance,
  entityType: "nonconformance_record",
  schema: erpNonconformanceCreateSchema,
  departmentScoped: true,
  searchFields: ["ncrNumber", "title", "severity", "disposition"],
  buildData: (body, user) => ({
    ncrNumber: body.ncrNumber ?? recordNumber("NCR"),
    workOrderId: body.workOrderId,
    partId: body.partId,
    title: body.title,
    severity: body.severity,
    disposition: body.disposition,
    priority: body.priority,
    status: body.status,
    departmentId: body.departmentId ?? user.departmentId,
    ownerId: body.ownerId ?? user.id,
    notes: body.notes
  })
});
