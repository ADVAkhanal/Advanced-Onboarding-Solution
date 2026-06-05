import Link from "next/link";
import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
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

export default async function TasksPage() {
  const user = await requirePermission("task:view");
  const scope =
    user.userLevel === "USER"
      ? { ownerId: user.id }
      : departmentScopeForUser(user);

  const [tasks, activeChecklists, missedCompletions] = await Promise.all([
    prisma.productivityTask.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, ...scope },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 100
    }),
    prisma.recurringChecklist.count({
      where: { organizationId: user.organizationId, archivedAt: null, active: true, ...departmentScopeForUser(user) }
    }),
    prisma.checklistCompletion.count({
      where: { organizationId: user.organizationId, archivedAt: null, status: "Missed", ...departmentScopeForUser(user) }
    })
  ]);

  const open = tasks.filter((task) => !["Complete", "Cancelled", "Archived"].includes(task.status)).length;
  const blocked = tasks.filter((task) => task.status === "Blocked").length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Tasks</p>
          <h1>Manager Task Board</h1>
          <p className="subhead">Track department tasks, ownership, due dates, blockers, and completion notes. Recurring checklists and the productivity board are on their own tabs below.</p>
        </div>
      </div>

      <TasksSubnav active="board" />

      <div className="grid four-col">
        <section className="card kpi"><div className="metric-label">Open tasks</div><div className="metric-value">{open}</div><div className="metric-note">In scope</div></section>
        <section className="card kpi"><div className="metric-label">Blocked tasks</div><div className={`metric-value ${blocked > 0 ? "tone-red" : ""}`}>{blocked}</div><div className="metric-note">Needs escalation</div></section>
        <section className="card kpi"><div className="metric-label">Active checklists</div><div className="metric-value">{activeChecklists}</div><div className="metric-note"><Link className="link" href="/tasks/checklists">View checklists →</Link></div></section>
        <section className="card kpi"><div className="metric-label">Missed completions</div><div className={`metric-value ${missedCompletions > 0 ? "tone-red" : ""}`}>{missedCompletions}</div><div className="metric-note">Audit visible</div></section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>Task Board</h2><span className="pill">{tasks.length}</span></div>
        {tasks.length ? (
          <table className="table">
            <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Due</th><th>Owner</th></tr></thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.status}</td>
                  <td>{task.priority.replaceAll("_", " ")}</td>
                  <td>{formatDate(task.dueDate)}</td>
                  <td>{task.ownerId ?? "Unassigned"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No tasks are currently recorded in your scope.</div>
        )}
      </section>
    </>
  );
}
