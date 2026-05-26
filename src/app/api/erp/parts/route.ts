import { erpPartCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates } from "@/lib/erp-routes";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.parts,
  entityType: "part",
  schema: erpPartCreateSchema,
  searchFields: ["partNumber", "revision", "description"],
  buildData: (body, user) => ({
    partNumber: body.partNumber,
    revision: body.revision,
    description: body.description,
    customerId: body.customerId,
    unitOfMeasure: body.unitOfMeasure,
    makeBuy: body.makeBuy,
    ownerId: user.id,
    status: body.status,
    notes: body.notes
  })
});
