import { redirect } from "next/navigation";
import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { formatShortDate, getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const user = await requirePermission("erp:view");
  if (user.userLevel === "USER") redirect("/erp/shop-floor");
  const refs = await getErpReferenceData(user);
  const schedule = await prisma.shopScheduleItem.findMany({
    where: { organizationId: user.organizationId, archivedAt: null, ...departmentScopeForUser(user) },
    orderBy: [{ scheduleDate: "asc" }, { updatedAt: "desc" }],
    take: 150
  });

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Scheduling</p><h1>Shop Schedule</h1><p className="subhead">Work-center schedule, production priorities, due dates, and ownership without heavyweight planning software sluggishness.</p></div></div>
      <div className="grid two-col">
        <ErpCreateForm title="Schedule Work" endpoint="/api/erp/schedule" fields={[
          { name: "workOrderId", label: "Work Order", type: "select", options: refs.workOrders.map((job) => ({ label: `${job.workOrderNumber} · ${job.title}`, value: job.id })) },
          { name: "operationId", label: "Operation", type: "select", options: refs.operations.map((op) => ({ label: `${op.operationNumber} · ${op.workCenter}`, value: op.id })) },
          { name: "workCenter", label: "Work Center", required: true },
          { name: "scheduleDate", label: "Schedule Date", type: "date", required: true },
          { name: "priority", label: "Priority", type: "select", defaultValue: "NORMAL", options: ["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"].map((value) => ({ label: value.replaceAll("_", " "), value })) }
        ]} />
        <section className="card"><div className="section-title"><h2>Coverage Signals</h2><span className="pill green">Live</span></div><div className="card-pad"><ul className="compact-list"><li><span>Scheduled items</span><strong>{schedule.length}</strong></li><li><span>Work centers represented</span><strong>{new Set(schedule.map((item) => item.workCenter)).size}</strong></li><li><span>Work stoppage priorities</span><strong>{schedule.filter((item) => item.priority === "WORK_STOPPAGE").length}</strong></li></ul></div></section>
      </div>
      <section className="card" style={{ marginTop: 14 }}><div className="section-title"><h2>Schedule Board</h2><span className="pill">{schedule.length}</span></div>{schedule.length ? <table className="table"><thead><tr><th>Date</th><th>Work Center</th><th>Status</th><th>Priority</th><th>Owner</th></tr></thead><tbody>{schedule.map((item) => <tr key={item.id}><td>{formatShortDate(item.scheduleDate)}</td><td>{item.workCenter}</td><td>{item.status}</td><td>{item.priority.replaceAll("_", " ")}</td><td>{item.ownerId ?? "Unassigned"}</td></tr>)}</tbody></table> : <div className="empty">No scheduled work yet.</div>}</section>
    </>
  );
}
