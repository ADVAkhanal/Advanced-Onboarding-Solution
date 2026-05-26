import { erpInventoryCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates } from "@/lib/erp-routes";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.inventory,
  entityType: "inventory_item",
  schema: erpInventoryCreateSchema,
  searchFields: ["itemNumber", "description", "locationCode"],
  buildData: (body, user) => ({
    itemNumber: body.itemNumber,
    partId: body.partId,
    description: body.description,
    itemType: body.itemType,
    unitOfMeasure: body.unitOfMeasure,
    quantityOnHand: body.quantityOnHand,
    quantityAllocated: body.quantityAllocated,
    reorderPoint: body.reorderPoint,
    locationCode: body.locationCode,
    status: body.status,
    ownerId: user.id,
    notes: body.notes
  })
});
