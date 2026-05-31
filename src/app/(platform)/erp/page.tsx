import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Boxes, ClipboardCheck, Factory, Handshake, PackageCheck, ShoppingCart, Truck } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { formatShortDate, getErpDashboardData } from "@/lib/erp-data";
import { KpiCard } from "@/components/kpi-card";

export const dynamic = "force-dynamic";

export default async function ErpCommandPage() {
  const user = await requirePermission("erp:view");
  if (user.userLevel === "USER") {
    redirect("/erp/shop-floor");
  }

  const data = await getErpDashboardData(user);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Internal Shop ERP</p>
          <h1>CleanOps ERP Command Center</h1>
          <p className="subhead">A fast internal system for customers, quotes, orders, jobs, inventory, purchasing, shipping, quality, scheduling, and shop-floor accountability.</p>
        </div>
        <div className="actions">
          <Link className="button primary" href="/erp/jobs">Open Jobs</Link>
          <Link className="button" href="/erp/quotes">Quotes & Orders</Link>
          {user.permissions.includes("report:view") ? (
            <Link className="button" href="/erp/dashboards">Analytics Dashboards</Link>
          ) : null}
        </div>
      </div>

      <div className="grid kpi-grid">
        <KpiCard label="Active work orders" value={data.metrics.activeWorkOrders} note={`${data.metrics.lateWorkOrders} late`} icon={Factory} tone={data.metrics.lateWorkOrders ? "red" : "green"} />
        <KpiCard label="Open quotes" value={data.metrics.openQuotes} note={`${data.metrics.activeSalesOrders} active orders`} icon={Handshake} />
        <KpiCard label="Inventory items" value={data.metrics.inventoryItems} note={`${data.metrics.lowStockItems} low stock flags`} icon={Boxes} tone={data.metrics.lowStockItems ? "amber" : "green"} />
        <KpiCard label="Open purchase orders" value={data.metrics.openPurchaseOrders} note={`${data.metrics.latePurchaseOrders} late`} icon={ShoppingCart} tone={data.metrics.latePurchaseOrders ? "red" : "green"} />
        <KpiCard label="Planned shipments" value={data.metrics.plannedShipments} note="Ready, planned, or on hold" icon={Truck} />
        <KpiCard label="Quality queue" value={data.metrics.pendingInspections} note={`${data.metrics.openNcrs} NCRs open`} icon={BadgeCheck} tone={data.metrics.openNcrs ? "amber" : "green"} />
      </div>

      <div className="grid content-grid" style={{ marginTop: 14 }}>
        <section className="card">
          <div className="section-title"><h2>Hot Jobs</h2><Link className="link" href="/erp/jobs">View jobs</Link></div>
          {data.hotJobs.length ? (
            <table className="table">
              <thead><tr><th>WO</th><th>Title</th><th>Status</th><th>Due</th><th>Material</th><th>Quality</th></tr></thead>
              <tbody>
                {data.hotJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.workOrderNumber}</td>
                    <td>{job.title}</td>
                    <td>{job.status}</td>
                    <td>{formatShortDate(job.dueDate)}</td>
                    <td>{job.materialStatus.replaceAll("_", " ")}</td>
                    <td>{job.qualityStatus.replaceAll("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">No active work orders are currently in scope.</div>}
        </section>

        <aside className="grid">
          <section className="card">
            <div className="section-title"><h2>ERP Modules</h2><PackageCheck size={18} /></div>
            <div className="card-pad">
              <ul className="compact-list">
                <li><span>Customers, quotes, orders</span><Link className="link" href="/erp/quotes">Open</Link></li>
                <li><span>Jobs, routers, operations</span><Link className="link" href="/erp/jobs">Open</Link></li>
                <li><span>Inventory and purchasing</span><Link className="link" href="/erp/inventory">Open</Link></li>
                <li><span>Shipping, receiving, quality</span><Link className="link" href="/erp/quality">Open</Link></li>
                <li><span>Safe ERP document metadata</span><Link className="link" href="/erp/documents">Open</Link></li>
              </ul>
            </div>
          </section>

          <section className="card">
            <div className="section-title"><h2>Execution Watch</h2><ClipboardCheck size={18} /></div>
            <div className="card-pad">
              <ul className="compact-list">
                <li><span>Scheduled work</span><strong>{data.metrics.scheduledToday}</strong></li>
                <li><span>Recent time entries</span><strong>{data.metrics.recentTimeEntries}</strong></li>
                <li><span>Customer accounts</span><strong>{data.metrics.customers}</strong></li>
              </ul>
            </div>
          </section>
        </aside>
      </div>

      <div className="grid two-col" style={{ marginTop: 14 }}>
        <section className="card">
          <div className="section-title"><h2>Purchasing Risk</h2><Link className="link" href="/erp/purchasing">View purchasing</Link></div>
          <div className="card-pad">
            <ul className="compact-list">
              {data.latePurchasing.length ? data.latePurchasing.map((po) => (
                <li key={po.id}><span>{po.poNumber}</span><strong>{po.expectedDate ? formatShortDate(po.expectedDate) : po.status}</strong></li>
              )) : <li><span>No open purchase orders in scope</span><strong>Clear</strong></li>}
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="section-title"><h2>Shipping & Quality</h2><Link className="link" href="/erp/shipping">View shipping</Link></div>
          <div className="card-pad">
            <ul className="compact-list">
              {data.shipments.length ? data.shipments.map((shipment) => (
                <li key={shipment.id}><span>{shipment.shipmentNumber}</span><strong>{shipment.shipDate ? formatShortDate(shipment.shipDate) : shipment.status}</strong></li>
              )) : <li><span>No planned shipments</span><strong>Clear</strong></li>}
              {data.qualityQueue.slice(0, 3).map((inspection) => (
                <li key={inspection.id}><span>{inspection.inspectionNumber}</span><strong>{inspection.status}</strong></li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
