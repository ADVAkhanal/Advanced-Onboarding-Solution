import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";
import { fmtDate, machineStatusLabel, machineStatusPill } from "@/lib/maintenance";
import { MaintenanceSubnav } from "../maintenance-subnav";

export const dynamic = "force-dynamic";

const CATEGORY_OPTIONS = ["5-Axis", "4-Axis", "3-Axis", "Mill-Turn", "Lathe", "Router", "Support", "Inspection"].map((v) => ({ label: v, value: v }));
const STATUS_OPTIONS = ["running", "down", "pm", "idle", "moving"].map((v) => ({ label: machineStatusLabel(v), value: v }));

export default async function MaintenanceMachinesPage() {
  const user = await requirePermission("maintenance:view");
  const canManage = user.permissions.includes("maintenance:manage");

  const machines = await prisma.machine.findMany({
    where: { organizationId: user.organizationId, archivedAt: null },
    orderBy: [{ building: "asc" }, { category: "asc" }, { code: "asc" }],
    take: 1000
  });

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Maintenance · Equipment</p>
          <h1>Machines</h1>
          <p className="subhead">Asset register — {machines.length} machines. Click PM Schedule or Work Orders to act on a machine.</p>
        </div>
      </div>

      <MaintenanceSubnav active="machines" />

      {canManage ? (
        <div style={{ marginBottom: 14 }}>
          <ErpCreateForm
            title="Add Machine"
            endpoint="/api/maintenance/machines"
            fields={[
              { name: "code", label: "Tag / Code", required: true },
              { name: "name", label: "Name", required: true },
              { name: "category", label: "Category", type: "select", options: CATEGORY_OPTIONS, defaultValue: "Support" },
              { name: "building", label: "Building", type: "number" },
              { name: "manufacturer", label: "Manufacturer" },
              { name: "envelope", label: "Work Envelope" },
              { name: "footprint", label: "Footprint" },
              { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "running" },
              { name: "notes", label: "Notes", type: "textarea" }
            ]}
          />
        </div>
      ) : null}

      <section className="card">
        <div className="section-title">
          <h2>Roster</h2>
          <span className="pill">{machines.length}</span>
        </div>
        {machines.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Name</th>
                <th>Category</th>
                <th>Bldg</th>
                <th>Status</th>
                <th>Work envelope</th>
                <th>Installed</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr key={m.id}>
                  <td>{m.code}</td>
                  <td>{m.name}</td>
                  <td>{m.category}</td>
                  <td>{m.building ?? "—"}</td>
                  <td>
                    <span className={`pill ${machineStatusPill(m.status)}`}>{machineStatusLabel(m.status)}</span>
                  </td>
                  <td>{m.envelope ?? "—"}</td>
                  <td>{fmtDate(m.installDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No machines yet. Load the baseline roster from the Overview tab.</div>
        )}
      </section>
    </>
  );
}
