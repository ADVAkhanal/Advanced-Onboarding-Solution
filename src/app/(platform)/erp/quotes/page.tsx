import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { decimalText, formatShortDate, getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const user = await requirePermission("erp:view");
  if (user.userLevel === "USER") redirect("/erp/shop-floor");
  const refs = await getErpReferenceData(user);
  const [quotes, orders] = await Promise.all([
    prisma.quote.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }], take: 100 }),
    prisma.salesOrder.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: [{ promisedDate: "asc" }, { updatedAt: "desc" }], take: 100 })
  ]);

  const customerOptions = refs.customers.map((customer) => ({ label: customer.name, value: customer.id }));
  const quoteOptions = quotes.map((quote) => ({ label: `${quote.quoteNumber} · ${quote.title}`, value: quote.id }));

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Sales Operations</p><h1>Quotes & Orders</h1><p className="subhead">Quote tracking, customer order handoff, safe estimated values, due dates, ownership, and status visibility without payment processing.</p></div></div>
      <div className="grid two-col">
        <ErpCreateForm title="Create Quote" endpoint="/api/erp/quotes" fields={[
          { name: "customerId", label: "Customer", type: "select", options: customerOptions },
          { name: "title", label: "Quote Title", required: true },
          { name: "dueDate", label: "Due Date", type: "date" },
          { name: "estimatedValue", label: "Estimated Value", type: "number" },
          { name: "priority", label: "Priority", type: "select", defaultValue: "NORMAL", options: ["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => ({ label: value.replaceAll("_", " "), value })) },
          { name: "notes", label: "Internal Notes", type: "textarea" }
        ]} />
        <ErpCreateForm title="Create Sales Order" endpoint="/api/erp/sales-orders" fields={[
          { name: "customerId", label: "Customer", type: "select", options: customerOptions },
          { name: "quoteId", label: "Related Quote", type: "select", options: quoteOptions },
          { name: "customerPoNumber", label: "Customer PO Number" },
          { name: "promisedDate", label: "Promised Date", type: "date" },
          { name: "priority", label: "Priority", type: "select", defaultValue: "NORMAL", options: ["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => ({ label: value.replaceAll("_", " "), value })) },
          { name: "notes", label: "Internal Notes", type: "textarea" }
        ]} />
      </div>
      <div className="grid two-col" style={{ marginTop: 14 }}>
        <section className="card"><div className="section-title"><h2>Quote Queue</h2><span className="pill">{quotes.length}</span></div>{quotes.length ? <table className="table"><thead><tr><th>Quote</th><th>Title</th><th>Due</th><th>Value</th><th>Status</th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id}><td>{quote.quoteNumber}</td><td>{quote.title}</td><td>{formatShortDate(quote.dueDate)}</td><td>{decimalText(quote.estimatedValue)}</td><td>{quote.status}</td></tr>)}</tbody></table> : <div className="empty">No quotes recorded yet.</div>}</section>
        <section className="card"><div className="section-title"><h2>Sales Orders</h2><span className="pill">{orders.length}</span></div>{orders.length ? <table className="table"><thead><tr><th>Order</th><th>Customer PO</th><th>Promised</th><th>Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>{order.orderNumber}</td><td>{order.customerPoNumber ?? "Not set"}</td><td>{formatShortDate(order.promisedDate)}</td><td>{order.status}</td></tr>)}</tbody></table> : <div className="empty">No sales orders recorded yet.</div>}</section>
      </div>
    </>
  );
}
