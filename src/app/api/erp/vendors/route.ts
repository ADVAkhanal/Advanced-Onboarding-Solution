import { erpVendorCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates } from "@/lib/erp-routes";
import { recordNumber } from "@/lib/numbering";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.vendors,
  entityType: "vendor_account",
  schema: erpVendorCreateSchema,
  searchFields: ["vendorNumber", "name", "primaryContactName", "primaryEmail"],
  buildData: (body, user) => ({
    vendorNumber: body.vendorNumber ?? recordNumber("VEN"),
    name: body.name,
    primaryContactName: body.primaryContactName,
    primaryEmail: body.primaryEmail,
    primaryPhone: body.primaryPhone,
    city: body.city,
    state: body.state,
    ownerId: body.ownerId ?? user.id,
    status: body.status,
    notes: body.notes
  })
});
