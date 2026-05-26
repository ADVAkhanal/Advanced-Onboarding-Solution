import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { decimalText, getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await requirePermission("erp:view");
  if (user.userLevel === "USER") redirect("/erp/shop-floor");
  const refs = await getErpReferenceData(user);
  const [customers, parts] = await Promise.all([
    prisma.customerAccount.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.part.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 100 })
  ]);

  return (
    <>
      <div className="page-head">
        <div><p className="eyebrow">ERP Master Data</p><h1>Customers & Parts</h1><p className="subhead">Safe CRM-lite account records and part master data without payment, card, CUI, or regulated technical-data storage.</p></div>
      </div>
      <div className="grid two-col">
        <ErpCreateForm title="Add Customer" endpoint="/api/erp/customers" fields={[
          { name: "name", label: "Customer Name", required: true },
          { name: "primaryContactName", label: "Primary Contact" },
          { name: "primaryEmail", label: "Email", type: "email" },
          { name: "primaryPhone", label: "Phone", type: "tel" },
          { name: "billingCity", label: "Billing City" },
          { name: "billingState", label: "Billing State" },
          { name: "notes", label: "Internal Notes", type: "textarea" }
        ]} />
        <ErpCreateForm title="Add Part" endpoint="/api/erp/parts" fields={[
          { name: "partNumber", label: "Part Number", required: true },
          { name: "revision", label: "Revision", defaultValue: "A" },
          { name: "description", label: "Description", required: true },
          { name: "customerId", label: "Customer", type: "select", options: refs.customers.map((customer) => ({ label: customer.name, value: customer.id })) },
          { name: "makeBuy", label: "Make / Buy", type: "select", defaultValue: "MAKE", options: [{ label: "Make", value: "MAKE" }, { label: "Buy", value: "BUY" }, { label: "Make or Buy", value: "MAKE_BUY" }] },
          { name: "unitOfMeasure", label: "Unit", defaultValue: "EA" }
        ]} />
      </div>
      <div className="grid two-col" style={{ marginTop: 14 }}>
        <section className="card"><div className="section-title"><h2>Customer Accounts</h2><span className="pill">{customers.length}</span></div>{customers.length ? <table className="table"><thead><tr><th>Account</th><th>Name</th><th>Contact</th><th>Status</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td>{customer.accountNumber}</td><td>{customer.name}</td><td>{customer.primaryContactName ?? customer.primaryEmail ?? "Not set"}</td><td>{customer.status}</td></tr>)}</tbody></table> : <div className="empty">No customer accounts yet.</div>}</section>
        <section className="card"><div className="section-title"><h2>Part Master</h2><span className="pill">{parts.length}</span></div>{parts.length ? <table className="table"><thead><tr><th>Part</th><th>Rev</th><th>Description</th><th>Make/Buy</th></tr></thead><tbody>{parts.map((part) => <tr key={part.id}><td>{part.partNumber}</td><td>{part.revision}</td><td>{part.description}</td><td>{part.makeBuy.replaceAll("_", " ")}</td></tr>)}</tbody></table> : <div className="empty">No parts yet. Add safe part metadata only.</div>}</section>
      </div>
      <p className="metric-note" style={{ marginTop: 10 }}>Customer and part records are internal operating metadata. Estimated values display as safe summaries only: {decimalText(0)}.</p>
    </>
  );
}
