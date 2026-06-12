import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fmtDate } from "@/lib/maintenance";
import { HandoffForm } from "./handoff-form";

export const dynamic = "force-dynamic";

function statusPill(status: string): string {
  if (status === "DOWN") return "red";
  if (status === "RUNNING") return "green";
  if (status === "SETUP") return "amber";
  return "";
}

export default async function ShiftHandoffPage() {
  const user = await requirePermission("erp:view");
  const now = Date.now();
  const since7d = new Date(now - 7 * 86_400_000);

  const [machines, handoffs] = await Promise.all([
    prisma.machine.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: [{ building: "asc" }, { code: "asc" }],
      select: { code: true, name: true },
      take: 1000
    }),
    prisma.shiftHandoff.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: [{ shiftDate: "desc" }, { createdAt: "desc" }],
      take: 20
    })
  ]);

  const entries = handoffs.length
    ? await prisma.shiftHandoffEntry.findMany({
        where: { organizationId: user.organizationId, archivedAt: null, handoffId: { in: handoffs.map((h) => h.id) } },
        orderBy: { machineCode: "asc" }
      })
    : [];
  const entriesByHandoff = new Map<string, typeof entries>();
  for (const e of entries) {
    const list = entriesByHandoff.get(e.handoffId) ?? [];
    list.push(e);
    entriesByHandoff.set(e.handoffId, list);
  }

  const recent = handoffs.filter((h) => h.createdAt.getTime() >= since7d.getTime()).length;
  const downReports = entries.filter((e) => e.status === "DOWN").length;
  const totalMade = entries.reduce((s, e) => s + (e.partsMade ?? 0), 0);
  const totalTarget = entries.reduce((s, e) => s + (e.partsTarget ?? 0), 0);
  const attainment = totalTarget > 0 ? Math.round((totalMade / totalTarget) * 100) : null;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Shop Floor · Shift Handoff</p>
          <h1>Shift Handoff</h1>
          <p className="subhead">
            End-of-shift handoff log — what ran, what&apos;s down, parts made vs target, and what the next
            shift needs to know. DOWN reports update the maintenance board; supervisors get a Pushover
            alert when configured.
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/maintenance">Maintenance</Link>
          <Link className="button" href="/erp/shop-floor">Shop floor</Link>
        </div>
      </div>

      <div className="grid four-col" style={{ marginBottom: 14 }}>
        <section className="card kpi">
          <div className="metric-label">Handoffs (7d)</div>
          <div>
            <div className="metric-value">{recent}</div>
            <div className="metric-note">{handoffs.length} shown</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">DOWN reports</div>
          <div>
            <div className={`metric-value ${downReports > 0 ? "tone-red" : "tone-green"}`}>{downReports}</div>
            <div className="metric-note">In shown handoffs</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Parts made / target</div>
          <div>
            <div className="metric-value">{totalMade.toLocaleString()} / {totalTarget.toLocaleString()}</div>
            <div className="metric-note">Across shown entries</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Attainment</div>
          <div>
            <div className={`metric-value ${attainment === null ? "" : attainment >= 95 ? "tone-green" : attainment >= 80 ? "tone-amber" : "tone-red"}`}>
              {attainment === null ? "—" : `${attainment}%`}
            </div>
            <div className="metric-note">Made ÷ target</div>
          </div>
        </section>
      </div>

      <div style={{ marginBottom: 14 }}>
        <HandoffForm machines={machines} />
      </div>

      {handoffs.length === 0 ? (
        <section className="card">
          <div className="empty">No handoffs yet — submit the first one above at end of shift.</div>
        </section>
      ) : (
        handoffs.map((h) => {
          const rows = entriesByHandoff.get(h.id) ?? [];
          const down = rows.filter((e) => e.status === "DOWN").length;
          return (
            <section className="card" key={h.id} style={{ marginBottom: 14 }}>
              <div className="section-title">
                <h2>
                  {h.shift} · {fmtDate(h.shiftDate)}
                </h2>
                <span style={{ display: "inline-flex", gap: 6 }}>
                  {down > 0 ? <span className="pill red">{down} down</span> : null}
                  <span className="pill">{rows.length} machines</span>
                </span>
              </div>
              <div className="card-pad" style={{ paddingTop: 0 }}>
                <div className="metric-note" style={{ marginBottom: 8 }}>
                  Submitted by {h.submittedByName ?? "—"}
                  {h.operators ? ` · Operators: ${h.operators}` : ""}
                </div>
                {rows.length ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Machine</th>
                        <th>WO</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Made</th>
                        <th style={{ textAlign: "right" }}>Target</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((e) => (
                        <tr key={e.id}>
                          <td>{e.machineCode}</td>
                          <td>{e.woNumber ?? "—"}</td>
                          <td>
                            <span className={`pill ${statusPill(e.status)}`}>{e.status}</span>
                          </td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{e.partsMade ?? "—"}</td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{e.partsTarget ?? "—"}</td>
                          <td>{e.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty">No machine entries on this handoff.</div>
                )}
                {h.notes ? (
                  <div className="module-note" style={{ marginTop: 10 }}>
                    Shift notes: {h.notes}
                  </div>
                ) : null}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
