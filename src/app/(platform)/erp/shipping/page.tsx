import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { formatShortDate, getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";
import { ShipmentActions } from "./shipment-actions";

export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const user = await requirePermission("erp:view");
  if (user.userLevel === "USER") redirect("/erp/shop-floor");
  const refs = await getErpReferenceData(user);
  const shipments = await prisma.shipment.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: [{ shipDate: "asc" }, { updatedAt: "desc" }], take: 100 });

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Fulfillment</p><h1>Shipping</h1><p className="subhead">Shipment planning, customer/order/job links, carriers, tracking numbers, and shipping readiness visibility.</p></div></div>
      <div className="grid two-col">
        <ErpCreateForm title="Plan Shipment" endpoint="/api/erp/shipments" fields={[
          { name: "customerId", label: "Customer", type: "select", options: refs.customers.map((customer) => ({ label: customer.name, value: customer.id })) },
          { name: "salesOrderId", label: "Sales Order", type: "select", options: refs.salesOrders.map((order) => ({ label: order.orderNumber, value: order.id })) },
          { name: "workOrderId", label: "Work Order", type: "select", options: refs.workOrders.map((job) => ({ label: `${job.workOrderNumber} · ${job.title}`, value: job.id })) },
          { name: "carrierName", label: "Carrier" },
          { name: "trackingNumber", label: "Tracking Number" },
          { name: "shipDate", label: "Ship Date", type: "date" },
          { name: "priority", label: "Priority", type: "select", defaultValue: "NORMAL", options: ["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => ({ label: value, value })) },
          { name: "notes", label: "Shipping Notes", type: "textarea" }
        ]} />
        <section className="card"><div className="section-title"><h2>Shipping Signals</h2><span className="pill">{shipments.length}</span></div><div className="card-pad"><ul className="compact-list"><li><span>Planned / ready</span><strong>{shipments.filter((shipment) => ["PLANNED", "READY"].includes(shipment.status)).length}</strong></li><li><span>On hold</span><strong>{shipments.filter((shipment) => shipment.status === "HOLD").length}</strong></li><li><span>Shipped</span><strong>{shipments.filter((shipment) => shipment.status === "SHIPPED").length}</strong></li></ul></div></section>
      </div>
      <section className="card" style={{ marginTop: 14 }}><div className="section-title"><h2>Shipment Board</h2><span className="pill">{shipments.length}</span></div>{shipments.length ? <table className="table"><thead><tr><th>Shipment</th><th>Ship Date</th><th>Carrier</th><th>Tracking</th><th>Status</th><th>ShipNotify</th></tr></thead><tbody>{shipments.map((shipment) => <tr key={shipment.id}><td>{shipment.shipmentNumber}</td><td>{formatShortDate(shipment.shipDate)}</td><td>{shipment.carrierName ?? "Not set"}</td><td>{shipment.trackingNumber ?? "Not set"}</td><td>{shipment.status}</td><td><ShipmentActions id={shipment.id} notified={Boolean(shipment.notifiedAt)} confirmed={Boolean(shipment.confirmedAt)} /></td></tr>)}</tbody></table> : <div className="empty">No shipments planned yet.</div>}</section>
    </>
  );
}
