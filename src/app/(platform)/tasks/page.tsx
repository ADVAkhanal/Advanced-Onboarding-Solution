import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function TasksPage() {
  const user = await requirePermission("task:view");
  const scope =
    user.userLevel === "USER"
      ? { ownerId: user.id }
      : departmentScopeForUser(user);

  const [tasks, recurringChecklists, missedCompletions] = await Promise.all([
    prisma.productivityTask.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, ...scope },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 100
    }),
    prisma.recurringChecklist.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        active: true,
        ...departmentScopeForUser(user)
      },
      orderBy: [{ checklistName: "asc" }],
      take: 50
    }),
    prisma.checklistCompletion.count({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        status: "Missed",
        ...departmentScopeForUser(user)
      }
    })
  ]);

  const open = tasks.filter((task) => !["Complete", "Cancelled", "Archived"].includes(task.status)).length;
  const blocked = tasks.filter((task) => task.status === "Blocked").length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Tasks & Recurring Checklists</p>
          <h1>Manager work, ownership, and follow-through</h1>
          <p className="subhead">Track department tasks, linked operational work, recurring checklists, due dates, blockers, and completion notes.</p>
        </div>
      </div>

      <div className="grid four-col">
        <section className="card kpi"><div className="metric-label">Open tasks</div><div className="metric-value">{open}</div><div className="metric-note">In scope</div></section>
        <section className="card kpi"><div className="metric-label">Blocked tasks</div><div className="metric-value">{blocked}</div><div className="metric-note">Needs escalation</div></section>
        <section className="card kpi"><div className="metric-label">Active checklists</div><div className="metric-value">{recurringChecklists.length}</div><div className="metric-note">Recurring management work</div></section>
        <section className="card kpi"><div className="metric-label">Missed completions</div><div className="metric-value">{missedCompletions}</div><div className="metric-note">Audit visible</div></section>
      </div>

      <div className="grid two-col" style={{ marginTop: 14 }}>
        <section className="card">
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

        <section className="card">
          <div className="section-title"><h2>Recurring Checklists</h2><span className="pill">{recurringChecklists.length}</span></div>
          <div className="card-pad">
            {recurringChecklists.length ? (
              <ul className="compact-list">
                {recurringChecklists.map((checklist) => (
                  <li key={checklist.id}><span>{checklist.checklistName}</span><strong>{checklist.frequency}</strong></li>
                ))}
              </ul>
            ) : (
              <div className="empty">No recurring checklists are active in your scope.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
