import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { decimalText, formatShortDate, getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";

export const dynamic = "force-dynamic";

export default async function PurchasingPage() {
  const user = await requirePermission("erp:view");
  if (user.userLevel === "USER") redirect("/erp/shop-floor");
  const refs = await getErpReferenceData(user);
  const [vendors, purchaseOrders, receipts] = await Promise.all([
    prisma.vendorAccount.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { name: "asc" }, take: 100 }),
    prisma.purchaseOrder.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: [{ expectedDate: "asc" }, { updatedAt: "desc" }], take: 100 }),
    prisma.receipt.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { receivedDate: "desc" }, take: 50 })
  ]);

  const vendorOptions = vendors.map((vendor) => ({ label: vendor.name, value: vendor.id }));
  const poOptions = purchaseOrders.map((po) => ({ label: po.poNumber, value: po.id }));

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Supply Chain</p><h1>Purchasing & Receiving</h1><p className="subhead">Vendor records, purchase order coordination, expected dates, receiving status, and material follow-through.</p></div></div>
      <div className="grid three-col">
        <ErpCreateForm compact title="Add Vendor" endpoint="/api/erp/vendors" fields={[
          { name: "name", label: "Vendor Name", required: true },
          { name: "primaryContactName", label: "Contact" },
          { name: "primaryEmail", label: "Email", type: "email" },
          { name: "primaryPhone", label: "Phone", type: "tel" }
        ]} />
        <ErpCreateForm compact title="Create Purchase Order" endpoint="/api/erp/purchasing" fields={[
          { name: "vendorId", label: "Vendor", type: "select", options: vendorOptions },
          { name: "expectedDate", label: "Expected Date", type: "date" },
          { name: "totalAmount", label: "Estimated Total", type: "number" },
          { name: "priority", label: "Priority", type: "select", defaultValue: "NORMAL", options: ["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => ({ label: value, value })) },
          { name: "notes", label: "Notes", type: "textarea" }
        ]} />
        <ErpCreateForm compact title="Record Receipt" endpoint="/api/erp/receipts" fields={[
          { name: "purchaseOrderId", label: "Purchase Order", type: "select", options: poOptions },
          { name: "vendorId", label: "Vendor", type: "select", options: vendorOptions },
          { name: "receivedDate", label: "Received Date", type: "date" },
          { name: "notes", label: "Receiving Notes", type: "textarea" }
        ]} />
      </div>
      <div className="grid two-col" style={{ marginTop: 14 }}>
        <section className="card"><div className="section-title"><h2>Purchase Orders</h2><span className="pill">{purchaseOrders.length}</span></div>{purchaseOrders.length ? <table className="table"><thead><tr><th>PO</th><th>Expected</th><th>Total</th><th>Status</th><th>Buyer</th></tr></thead><tbody>{purchaseOrders.map((po) => <tr key={po.id}><td>{po.poNumber}</td><td>{formatShortDate(po.expectedDate)}</td><td>{decimalText(po.totalAmount)}</td><td>{po.status}</td><td>{po.buyerId ?? "Not set"}</td></tr>)}</tbody></table> : <div className="empty">No purchase orders recorded.</div>}</section>
        <section className="card"><div className="section-title"><h2>Recent Receipts</h2><span className="pill">{receipts.length}</span></div>{receipts.length ? <table className="table"><thead><tr><th>Receipt</th><th>Date</th><th>Status</th><th>Notes</th></tr></thead><tbody>{receipts.map((receipt) => <tr key={receipt.id}><td>{receipt.receiptNumber}</td><td>{formatShortDate(receipt.receivedDate)}</td><td>{receipt.status}</td><td>{receipt.notes ?? ""}</td></tr>)}</tbody></table> : <div className="empty">No receipts recorded.</div>}</section>
      </div>
      <section className="card" style={{ marginTop: 14 }}><div className="section-title"><h2>Vendors</h2><span className="pill">{refs.vendors.length}</span></div>{refs.vendors.length ? <table className="table"><thead><tr><th>Vendor</th><th>Name</th><th>Contact</th><th>Status</th></tr></thead><tbody>{refs.vendors.map((vendor) => <tr key={vendor.id}><td>{vendor.vendorNumber}</td><td>{vendor.name}</td><td>{vendor.primaryContactName ?? vendor.primaryEmail ?? "Not set"}</td><td>{vendor.status}</td></tr>)}</tbody></table> : <div className="empty">No vendors yet.</div>}</section>
    </>
  );
}
