import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalText } from "@/lib/erp-data";
import { ErpCreateForm } from "@/components/erp-create-form";
import { fmtDate } from "@/lib/maintenance";
import { MaintenanceSubnav } from "../maintenance-subnav";

export const dynamic = "force-dynamic";

export default async function MaintenanceDowntimePage() {
  const user = await requirePermission("maintenance:view");
  const canManage = user.permissions.includes("maintenance:manage");

  const [machines, events] = await Promise.all([
    prisma.machine.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: [{ building: "asc" }, { code: "asc" }],
      select: { id: true, code: true, name: true },
      take: 1000
    }),
    prisma.maintenanceDowntimeEvent.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: { startAt: "desc" },
      take: 300
    })
  ]);

  const mById = new Map(machines.map((m) => [m.id, m]));
  const machineOptions = machines.map((m) => ({ label: `${m.code} · ${m.name}`, value: m.id }));
  const totalHours = events.reduce((s, e) => s + (e.hours ? Number(e.hours) : 0), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Maintenance · Reliability</p>
          <h1>Downtime Log</h1>
          <p className="subhead">{events.length} events · {Math.round(totalHours * 10) / 10} total hours. Log every unplanned stop so patterns and problem machines become visible.</p>
        </div>
      </div>

      <MaintenanceSubnav active="downtime" />

      {canManage ? (
        <div style={{ marginBottom: 14 }}>
          <ErpCreateForm
            title="Log downtime event"
            endpoint="/api/maintenance/downtime"
            fields={[
              { name: "machineId", label: "Machine", type: "select", required: true, options: machineOptions },
              { name: "startAt", label: "Start date", type: "date", required: true },
              { name: "hours", label: "Duration (hours)", type: "number" },
              { name: "reason", label: "Reason" },
              { name: "rootCause", label: "Root cause" },
              { name: "resolution", label: "Resolution" }
            ]}
          />
        </div>
      ) : null}

      <section className="card">
        <div className="section-title">
          <h2>Events</h2>
          <span className="pill">{events.length}</span>
        </div>
        {events.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Start</th>
                <th>Machine</th>
                <th style={{ textAlign: "right" }}>Hours</th>
                <th>Reason</th>
                <th>Root cause</th>
                <th>Resolution</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{fmtDate(e.startAt)}</td>
                  <td>{mById.get(e.machineId)?.code ?? "—"}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{e.hours != null ? decimalText(e.hours) : "—"}</td>
                  <td>{e.reason ?? "—"}</td>
                  <td>{e.rootCause ?? "—"}</td>
                  <td>{e.resolution ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No downtime logged. That&apos;s either great uptime — or unlogged stops.</div>
        )}
      </section>
    </>
  );
}
