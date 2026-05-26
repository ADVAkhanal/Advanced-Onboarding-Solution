import { erpCustomerCreateSchema } from "@/lib/validators";
import { createErpCollectionHandlers, erpDelegates } from "@/lib/erp-routes";
import { recordNumber } from "@/lib/numbering";

export const dynamic = "force-dynamic";

export const { GET, POST } = createErpCollectionHandlers({
  delegate: erpDelegates.customers,
  entityType: "customer_account",
  schema: erpCustomerCreateSchema,
  searchFields: ["accountNumber", "name", "primaryContactName", "primaryEmail"],
  buildData: (body, user) => ({
    accountNumber: body.accountNumber ?? recordNumber("CUS"),
    name: body.name,
    primaryContactName: body.primaryContactName,
    primaryEmail: body.primaryEmail,
    primaryPhone: body.primaryPhone,
    billingCity: body.billingCity,
    billingState: body.billingState,
    shippingCity: body.shippingCity,
    shippingState: body.shippingState,
    ownerId: body.ownerId ?? user.id,
    status: body.status,
    notes: body.notes
  })
});
