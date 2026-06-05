import Link from "next/link";
import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmtWhen(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
}

function TasksSubnav({ active }: { active: "board" | "checklists" | "productivity" }) {
  return (
    <div className="toolbar" style={{ marginBottom: 14 }}>
      <Link className={`tb-btn${active === "board" ? " active" : ""}`} href="/tasks">Task Board</Link>
      <Link className={`tb-btn${active === "checklists" ? " active" : ""}`} href="/tasks/checklists">Recurring Checklists</Link>
      <Link className={`tb-btn${active === "productivity" ? " active" : ""}`} href="/tasks/productivity">Productivity Board</Link>
    </div>
  );
}

export default async function RecurringChecklistsPage() {
  const user = await requirePermission("task:view");
  const scope = departmentScopeForUser(user);
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const checklists = await prisma.recurringChecklist.findMany({
    where: { organizationId: user.organizationId, archivedAt: null, active: true, ...scope },
    orderBy: [{ checklistName: "asc" }],
    take: 100
  });

  const checklistIds = checklists.map((c) => c.id);

  const [itemCounts, completions, missedCount] = await Promise.all([
    checklistIds.length
      ? prisma.recurringChecklistItem.groupBy({
          by: ["recurringChecklistId"],
          where: { organizationId: user.organizationId, archivedAt: null, recurringChecklistId: { in: checklistIds } },
          _count: { _all: true }
        })
      : Promise.resolve([]),
    prisma.checklistCompletion.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, completedAt: { gte: since30 }, ...scope },
      orderBy: { completedAt: "desc" },
      take: 20
    }),
    prisma.checklistCompletion.count({
      where: { organizationId: user.organizationId, archivedAt: null, status: "Missed", ...scope }
    })
  ]);

  const itemCountByChecklist = new Map(itemCounts.map((r) => [r.recurringChecklistId, r._count._all]));
  const lastCompletedByChecklist = new Map<string, Date>();
  for (const c of completions) {
    if (!lastCompletedByChecklist.has(c.recurringChecklistId)) {
      lastCompletedByChecklist.set(c.recurringChecklistId, c.completedAt);
    }
  }
  const checklistName = new Map(checklists.map((c) => [c.id, c.checklistName]));
  const completed30 = completions.filter((c) => c.status === "Complete").length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Tasks · Recurring Checklists</p>
          <h1>Recurring Checklist Center</h1>
          <p className="subhead">Active recurring checklists, their items, recent completions, and missed-completion accountability.</p>
        </div>
      </div>

      <TasksSubnav active="checklists" />

      <div className="grid four-col">
        <section className="card kpi"><div className="metric-label">Active checklists</div><div className="metric-value">{checklists.length}</div><div className="metric-note">In scope</div></section>
        <section className="card kpi"><div className="metric-label">Completed (30d)</div><div className="metric-value">{completed30}</div><div className="metric-note">Recent activity</div></section>
        <section className="card kpi"><div className="metric-label">Missed</div><div className={`metric-value ${missedCount > 0 ? "tone-red" : "tone-green"}`}>{missedCount}</div><div className="metric-note">Audit visible</div></section>
        <section className="card kpi"><div className="metric-label">Recent completions</div><div className="metric-value">{completions.length}</div><div className="metric-note">Last 30 days</div></section>
      </div>

      <div className="grid two-col" style={{ marginTop: 14 }}>
        <section className="card">
          <div className="section-title"><h2>Checklists</h2><span className="pill">{checklists.length}</span></div>
          {checklists.length ? (
            <table className="table">
              <thead><tr><th>Checklist</th><th>Frequency</th><th style={{ textAlign: "right" }}>Items</th><th>Last completed</th></tr></thead>
              <tbody>
                {checklists.map((c) => (
                  <tr key={c.id}>
                    <td>{c.checklistName}</td>
                    <td>{c.frequency}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{itemCountByChecklist.get(c.id) ?? 0}</td>
                    <td>{fmtWhen(lastCompletedByChecklist.get(c.id) ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No recurring checklists are active in your scope.</div>
          )}
        </section>

        <section className="card">
          <div className="section-title"><h2>Recent Completions</h2><span className="pill">{completions.length}</span></div>
          <div className="card-pad">
            {completions.length ? (
              <ul className="compact-list">
                {completions.map((c) => (
                  <li key={c.id}>
                    <span>{checklistName.get(c.recurringChecklistId) ?? "Checklist"} · {fmtWhen(c.completedAt)}</span>
                    <strong className={c.status === "Missed" ? "tone-red" : c.status === "Complete" ? "tone-green" : ""}>{c.status}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty">No completions recorded in the last 30 days.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
