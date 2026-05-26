import { erpDocumentCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates } from "@/lib/erp-routes";
import { recordNumber } from "@/lib/numbering";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.documents,
  entityType: "document_record",
  schema: erpDocumentCreateSchema,
  departmentScoped: true,
  searchFields: ["documentNumber", "title", "documentType", "revision"],
  buildData: (body, user) => ({
    documentNumber: body.documentNumber ?? recordNumber("DOC"),
    title: body.title,
    documentType: body.documentType,
    revision: body.revision,
    relatedType: body.relatedType,
    relatedId: body.relatedId,
    status: body.status,
    departmentId: body.departmentId ?? user.departmentId,
    ownerId: body.ownerId ?? user.id,
    notes: body.notes
  })
});
