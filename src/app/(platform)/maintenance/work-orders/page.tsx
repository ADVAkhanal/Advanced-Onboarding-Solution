import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";
import { fmtDate, woStatusLabel, woStatusPill } from "@/lib/maintenance";
import { MaintenanceSubnav } from "../maintenance-subnav";
import { WorkOrderStatusForm } from "./work-order-status-form";

export const dynamic = "force-dynamic";

const PRIORITY_OPTIONS = ["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"].map((v) => ({ label: v.replaceAll("_", " "), value: v }));

export default async function MaintenanceWorkOrdersPage() {
  const user = await requirePermission("maintenance:view");
  const canManage = user.permissions.includes("maintenance:manage");

  const [machines, workOrders] = await Promise.all([
    prisma.machine.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: [{ building: "asc" }, { code: "asc" }],
      select: { id: true, code: true, name: true },
      take: 1000
    }),
    prisma.maintenanceWorkOrder.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
      take: 300
    })
  ]);

  const mById = new Map(machines.map((m) => [m.id, m]));
  const machineOptions = machines.map((m) => ({ label: `${m.code} · ${m.name}`, value: m.id }));
  const open = workOrders.filter((w) => w.status !== "DONE");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Maintenance · Work</p>
          <h1>Maintenance Work Orders</h1>
          <p className="subhead">{open.length} open of {workOrders.length}. Anyone can report a machine issue; maintenance triages, assigns, and closes.</p>
        </div>
      </div>

      <MaintenanceSubnav active="work-orders" />

      <div style={{ marginBottom: 14 }}>
        <ErpCreateForm
          title="Report a maintenance issue / new work order"
          endpoint="/api/maintenance/work-orders"
          fields={[
            { name: "title", label: "Title", required: true },
            { name: "machineId", label: "Machine", type: "select", options: machineOptions },
            { name: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS, defaultValue: "NORMAL" },
            { name: "requestedByDept", label: "Your department / area" },
            { name: "dueDate", label: "Needed by", type: "date" },
            { name: "description", label: "What's happening?", type: "textarea" }
          ]}
        />
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Work orders</h2>
          <span className="pill">{workOrders.length}</span>
        </div>
        {workOrders.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>WO</th>
                <th>Title</th>
                <th>Machine</th>
                <th>Priority</th>
                <th>Requested by</th>
                <th>Due</th>
                <th>{canManage ? "Status / assignee" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((w) => (
                <tr key={w.id}>
                  <td>{w.woNumber}</td>
                  <td>{w.title}</td>
                  <td>{w.machineId ? mById.get(w.machineId)?.code ?? "—" : "—"}</td>
                  <td>{w.priority.replaceAll("_", " ")}</td>
                  <td>{w.requestedByName ?? "—"}{w.source === "public" ? <span className="pill" style={{ marginLeft: 6 }}>public</span> : null}</td>
                  <td>{fmtDate(w.dueDate)}</td>
                  <td>
                    {canManage ? (
                      <WorkOrderStatusForm id={w.id} status={w.status} assignee={w.assignee} />
                    ) : (
                      <span className={`pill ${woStatusPill(w.status)}`}>{woStatusLabel(w.status)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No work orders yet.</div>
        )}
      </section>
    </>
  );
}
