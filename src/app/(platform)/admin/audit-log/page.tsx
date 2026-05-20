import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogPage() {
  const user = await requirePermission("audit:view");
  const events = await prisma.auditLog.findMany({
    where: { organizationId: user.organizationId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    take: 150
  });

  const failures = events.filter((event) => event.outcome !== "SUCCESS").length;
  const exports = events.filter((event) => event.action.includes("export")).length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin · Audit Log</p>
          <h1>Operational accountability trail</h1>
          <p className="subhead">Sensitive actions, login events, workflow changes, approval decisions, exports, notifications, and admin changes are recorded for management accountability.</p>
        </div>
      </div>

      <div className="grid three-col">
        <section className="card kpi"><div className="metric-label">Recent events</div><div className="metric-value">{events.length}</div><div className="metric-note">Latest 150 shown</div></section>
        <section className="card kpi"><div className="metric-label">Non-success outcomes</div><div className="metric-value">{failures}</div><div className="metric-note">Failed or denied actions</div></section>
        <section className="card kpi"><div className="metric-label">Export actions</div><div className="metric-value">{exports}</div><div className="metric-note">Report/export visibility</div></section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>Audit Events</h2><span className="pill green">Immutable application log</span></div>
        {events.length ? (
          <table className="table">
            <thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Outcome</th><th>Actor</th><th>Reason</th></tr></thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(event.createdAt)}</td>
                  <td>{event.action}</td>
                  <td>{event.entityType}{event.entityId ? ` · ${event.entityId.slice(0, 8)}` : ""}</td>
                  <td>{event.outcome}</td>
                  <td>{event.actorId ?? "System"}</td>
                  <td>{event.reason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">Audit events will appear as users sign in, create records, approve work, export reports, and update settings.</div>
        )}
      </section>
    </>
  );
}
