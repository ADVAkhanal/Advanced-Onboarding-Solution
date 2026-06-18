import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { loadActionCenter, summarizeAlerts, type ActionAlert } from "@/lib/action-center";

export const dynamic = "force-dynamic";

function sevPill(s: ActionAlert["severity"]): string {
  return s === "critical" ? "red" : s === "warning" ? "amber" : "";
}

export default async function ActionCenterPage() {
  const user = await requirePermission("report:view");
  const alerts = await loadActionCenter(user);
  const sum = summarizeAlerts(alerts);

  const byModule = new Map<string, ActionAlert[]>();
  for (const a of alerts) {
    const list = byModule.get(a.module) ?? [];
    list.push(a);
    byModule.set(a.module, list);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Operations · Command</p>
          <h1>Action Center</h1>
          <p className="subhead">
            Everything that needs attention right now — overdue jobs, late POs, shipments due, low
            stock, open quality issues, unassigned tickets, and pending approvals. Rule-based,
            refreshed continuously, no AI.
          </p>
        </div>
      </div>

      <div className="grid four-col" style={{ marginBottom: 14 }}>
        <section className="card kpi">
          <div className="metric-label">Needs attention</div>
          <div><div className="metric-value">{sum.total}</div><div className="metric-note">live alerts</div></div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Critical</div>
          <div><div className={`metric-value ${sum.critical ? "tone-red" : ""}`}>{sum.critical}</div><div className="metric-note">act now</div></div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Warning</div>
          <div><div className={`metric-value ${sum.warning ? "tone-amber" : ""}`}>{sum.warning}</div><div className="metric-note">soon</div></div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Info</div>
          <div><div className="metric-value">{sum.info}</div><div className="metric-note">for awareness</div></div>
        </section>
      </div>

      {alerts.length === 0 ? (
        <section className="card"><div className="empty">All clear — nothing needs attention right now.</div></section>
      ) : (
        [...byModule.entries()].map(([module, list]) => (
          <section className="card" key={module} style={{ marginBottom: 14 }}>
            <div className="section-title">
              <h2>{module}</h2>
              <span className="pill">{list.length}</span>
            </div>
            <div className="card-pad">
              {list.map((a) => (
                <div className="action-alert" key={a.id}>
                  <span className={`pill ${sevPill(a.severity)}`}>{a.severity}</span>
                  <div className="action-alert-body">
                    <Link href={a.href} className="action-alert-title">{a.title}</Link>
                    {a.detail ? <div className="metric-note">{a.detail}</div> : null}
                    <div className="action-alert-next">→ {a.suggestedAction}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
