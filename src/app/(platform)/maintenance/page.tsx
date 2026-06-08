import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  daysUntil,
  fmtDate,
  machineStatusLabel,
  machineStatusPill,
  woStatusLabel,
  woStatusPill
} from "@/lib/maintenance";
import { MaintenanceSubnav } from "./maintenance-subnav";
import { MaintenanceSeedButton } from "./seed-button";

export const dynamic = "force-dynamic";

export default async function MaintenanceOverviewPage() {
  const user = await requirePermission("maintenance:view");
  const org = user.organizationId;
  const canManage = user.permissions.includes("maintenance:manage");
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const where = { organizationId: org, archivedAt: null };

  const [machines, openWOs, pmDue, parts] = await Promise.all([
    prisma.machine.findMany({ where, orderBy: [{ building: "asc" }, { code: "asc" }], take: 500 }),
    prisma.maintenanceWorkOrder.findMany({
      where: { ...where, status: { not: "DONE" } },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 100
    }),
    prisma.pmTask.findMany({
      where: { ...where, status: "ACTIVE", nextDueAt: { lte: in7 } },
      orderBy: { nextDueAt: "asc" },
      take: 100
    }),
    prisma.maintenancePart.findMany({ where, take: 1000 })
  ]);

  const mById = new Map(machines.map((m) => [m.id, m]));
  const running = machines.filter((m) => m.status === "running").length;
  const down = machines.filter((m) => m.status === "down").length;
  const inPm = machines.filter((m) => m.status === "pm").length;
  const uptime = machines.length ? Math.round((running / machines.length) * 100) : 0;
  const overduePm = pmDue.filter((p) => p.nextDueAt && p.nextDueAt.getTime() < now.getTime()).length;
  const overdueWo = openWOs.filter((w) => w.dueDate && w.dueDate.getTime() < now.getTime()).length;
  const low = parts.filter((p) => p.quantityOnHand <= p.reorderPoint);
  const critLow = low.filter((p) => p.critical).length;

  const statusCounts = ["running", "down", "pm", "idle", "moving"]
    .map((s) => ({ s, n: machines.filter((m) => m.status === s).length }))
    .filter((x) => x.n > 0);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Maintenance · CMMS</p>
          <h1>Maintenance Command</h1>
          <p className="subhead">
            Equipment register, preventive-maintenance schedule, maintenance work orders, MRO supplies, and
            downtime — all in one place. Operational metadata only.
          </p>
        </div>
        <div className="actions">
          <Link className="button primary" href="/maintenance/work-orders">
            New Work Order
          </Link>
          <Link className="button" href="/maintenance/pm">
            PM Schedule
          </Link>
        </div>
      </div>

      <MaintenanceSubnav active="overview" />

      {machines.length === 0 ? (
        <section className="card">
          <div className="card-pad">
            <div className="empty" style={{ marginBottom: 14 }}>
              No machines yet. {canManage ? "Load the Advanced PMC roster (machines, MRO supplies, and PM schedule) to get started." : "Ask a maintenance manager to load the machine roster."}
            </div>
            {canManage ? <MaintenanceSeedButton /> : null}
          </div>
        </section>
      ) : (
        <>
          <div className="grid four-col" style={{ marginBottom: 14 }}>
            <section className="card kpi">
              <div className="metric-label">Shop uptime</div>
              <div>
                <div className={`metric-value ${uptime >= 80 ? "tone-green" : uptime >= 60 ? "tone-amber" : "tone-red"}`}>{uptime}%</div>
                <div className="metric-note">{running} of {machines.length} running</div>
              </div>
            </section>
            <section className="card kpi">
              <div className="metric-label">Machines down</div>
              <div>
                <div className={`metric-value ${down > 0 ? "tone-red" : "tone-green"}`}>{down}</div>
                <div className="metric-note">{inPm} in PM</div>
              </div>
            </section>
            <section className="card kpi">
              <div className="metric-label">PM due (7 days)</div>
              <div>
                <div className={`metric-value ${overduePm > 0 ? "tone-red" : "tone-amber"}`}>{pmDue.length}</div>
                <div className="metric-note">{overduePm} overdue</div>
              </div>
            </section>
            <section className="card kpi">
              <div className="metric-label">Open work orders</div>
              <div>
                <div className={`metric-value ${overdueWo > 0 ? "tone-red" : ""}`}>{openWOs.length}</div>
                <div className="metric-note">{overdueWo} overdue</div>
              </div>
            </section>
            <section className="card kpi">
              <div className="metric-label">MRO low stock</div>
              <div>
                <div className={`metric-value ${low.length > 0 ? "tone-amber" : "tone-green"}`}>{low.length}</div>
                <div className="metric-note">{critLow} critical</div>
              </div>
            </section>
          </div>

          <div className="grid two-col">
            <section className="card">
              <div className="section-title">
                <h2>Machines by status</h2>
                <Link className="link" href="/maintenance/machines">All machines →</Link>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Machines</th>
                  </tr>
                </thead>
                <tbody>
                  {statusCounts.map((x) => (
                    <tr key={x.s}>
                      <td>
                        <span className={`pill ${machineStatusPill(x.s)}`}>{machineStatusLabel(x.s)}</span>
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{x.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card">
              <div className="section-title">
                <h2>PM due (next 7 days)</h2>
                <span className="pill">{pmDue.length}</span>
              </div>
              {pmDue.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Machine</th>
                      <th>Task</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pmDue.slice(0, 12).map((p) => {
                      const d = daysUntil(p.nextDueAt, now);
                      const late = d !== null && d < 0;
                      return (
                        <tr key={p.id}>
                          <td>{mById.get(p.machineId)?.code ?? "—"}</td>
                          <td>{p.title}</td>
                          <td>
                            <span className={`pill ${late ? "red" : "amber"}`}>{late ? `${Math.abs(d as number)}d late` : fmtDate(p.nextDueAt)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="empty">Nothing due in the next 7 days.</div>
              )}
            </section>

            <section className="card">
              <div className="section-title">
                <h2>Open work orders</h2>
                <Link className="link" href="/maintenance/work-orders">All →</Link>
              </div>
              {openWOs.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>WO</th>
                      <th>Title</th>
                      <th>Machine</th>
                      <th>Status</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openWOs.slice(0, 12).map((w) => (
                      <tr key={w.id}>
                        <td>{w.woNumber}</td>
                        <td>{w.title}</td>
                        <td>{w.machineId ? mById.get(w.machineId)?.code ?? "—" : "—"}</td>
                        <td>
                          <span className={`pill ${woStatusPill(w.status)}`}>{woStatusLabel(w.status)}</span>
                        </td>
                        <td>{fmtDate(w.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty">No open work orders.</div>
              )}
            </section>

            <section className="card">
              <div className="section-title">
                <h2>Low MRO stock</h2>
                <Link className="link" href="/maintenance/parts">All parts →</Link>
              </div>
              {low.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th style={{ textAlign: "right" }}>On hand</th>
                      <th style={{ textAlign: "right" }}>Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {low.slice(0, 12).map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}{p.critical ? <span className="pill red" style={{ marginLeft: 6 }}>CRIT</span> : null}</td>
                        <td>{p.subCategory ?? p.category ?? "—"}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--red)" }}>{p.quantityOnHand}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.reorderPoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty">All MRO items above reorder point.</div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
