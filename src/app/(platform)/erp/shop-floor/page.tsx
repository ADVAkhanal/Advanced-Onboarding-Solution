import { requirePermission } from "@/lib/auth";
import { decimalText, formatShortDate, getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";

export const dynamic = "force-dynamic";

export default async function ShopFloorPage() {
  const user = await requirePermission("erp:view");
  const refs = await getErpReferenceData(user);
  const userScope = user.userLevel === "USER" ? { userId: user.id } : {};
  const timeEntries = await prisma.timeEntry.findMany({
    where: { organizationId: user.organizationId, archivedAt: null, ...userScope },
    orderBy: [{ entryDate: "desc" }, { updatedAt: "desc" }],
    take: 100
  });
  const schedule = await prisma.shopScheduleItem.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      ...(user.userLevel === "USER" ? { ownerId: user.id } : {})
    },
    orderBy: [{ scheduleDate: "asc" }, { updatedAt: "desc" }],
    take: 50
  });

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Shop Floor</p><h1>My Work & Time</h1><p className="subhead">A lightweight shop-floor view for assigned work, scheduled items, and job time entries. Time entries support job costing and operations visibility; they are not payroll processing.</p></div></div>
      <div className="grid two-col">
        <ErpCreateForm title="Submit Time Entry" endpoint="/api/erp/time-entries" fields={[
          { name: "workOrderId", label: "Work Order", type: "select", options: refs.workOrders.map((job) => ({ label: `${job.workOrderNumber} · ${job.title}`, value: job.id })) },
          { name: "operationId", label: "Operation", type: "select", options: refs.operations.map((op) => ({ label: `${op.operationNumber} · ${op.workCenter}`, value: op.id })) },
          { name: "entryDate", label: "Entry Date", type: "date", required: true },
          { name: "hours", label: "Hours", type: "number", required: true },
          { name: "notes", label: "Work Notes", type: "textarea" }
        ]} />
        <section className="card"><div className="section-title"><h2>Shop Signals</h2><span className="pill green">Live</span></div><div className="card-pad"><ul className="compact-list"><li><span>Visible work orders</span><strong>{refs.workOrders.length}</strong></li><li><span>Scheduled items</span><strong>{schedule.length}</strong></li><li><span>Time entries</span><strong>{timeEntries.length}</strong></li></ul></div></section>
      </div>
      <div className="grid two-col" style={{ marginTop: 14 }}>
        <section className="card"><div className="section-title"><h2>Scheduled Work</h2><span className="pill">{schedule.length}</span></div>{schedule.length ? <table className="table"><thead><tr><th>Date</th><th>Work Center</th><th>Status</th><th>Priority</th></tr></thead><tbody>{schedule.map((item) => <tr key={item.id}><td>{formatShortDate(item.scheduleDate)}</td><td>{item.workCenter}</td><td>{item.status}</td><td>{item.priority.replaceAll("_", " ")}</td></tr>)}</tbody></table> : <div className="empty">No scheduled work is assigned in your scope.</div>}</section>
        <section className="card"><div className="section-title"><h2>Time Entries</h2><span className="pill">{timeEntries.length}</span></div>{timeEntries.length ? <table className="table"><thead><tr><th>Date</th><th>Hours</th><th>Type</th><th>Status</th><th>Notes</th></tr></thead><tbody>{timeEntries.map((entry) => <tr key={entry.id}><td>{formatShortDate(entry.entryDate)}</td><td>{decimalText(entry.hours)}</td><td>{entry.entryType}</td><td>{entry.status}</td><td>{entry.notes ?? ""}</td></tr>)}</tbody></table> : <div className="empty">No time entries yet.</div>}</section>
      </div>
    </>
  );
}
