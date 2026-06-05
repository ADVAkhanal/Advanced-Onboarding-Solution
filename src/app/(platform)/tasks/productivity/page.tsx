import Link from "next/link";
import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Map free-text task statuses into four board lanes.
const LANES: Array<{ key: string; label: string }> = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" }
];

function laneFor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("block")) return "blocked";
  if (s.includes("progress") || s.includes("doing") || s.includes("started") && !s.includes("not")) return "in_progress";
  if (s.includes("complete") || s.includes("done") || s.includes("cancel") || s.includes("archiv")) return "done";
  return "todo";
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

export default async function ProductivityBoardPage() {
  const user = await requirePermission("task:view");
  const scope =
    user.userLevel === "USER" ? { ownerId: user.id } : departmentScopeForUser(user);

  const [boards, tasks] = await Promise.all([
    prisma.productivityBoard.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, status: "Active", ...departmentScopeForUser(user) },
      orderBy: { name: "asc" },
      take: 20
    }),
    prisma.productivityTask.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, ...scope },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 300
    })
  ]);

  const byLane = new Map<string, typeof tasks>();
  for (const lane of LANES) byLane.set(lane.key, []);
  for (const task of tasks) {
    byLane.get(laneFor(task.status))!.push(task);
  }

  const fmtDate = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(d) : "—";

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Tasks · Productivity</p>
          <h1>Department Productivity Board</h1>
          <p className="subhead">
            Department tasks organized into a board by status. {boards.length} configured board
            {boards.length === 1 ? "" : "s"} in scope.
          </p>
        </div>
      </div>

      <TasksSubnav active="productivity" />

      <div className="grid four-col">
        {LANES.map((lane) => {
          const laneTasks = byLane.get(lane.key) ?? [];
          return (
            <section className="card" key={lane.key} aria-label={`${lane.label} lane`}>
              <div className="section-title">
                <h2>{lane.label}</h2>
                <span className={`pill${lane.key === "blocked" && laneTasks.length ? " red" : ""}`}>{laneTasks.length}</span>
              </div>
              <div className="card-pad" style={{ display: "grid", gap: 8 }}>
                {laneTasks.length ? (
                  laneTasks.slice(0, 50).map((task) => (
                    <div key={task.id} className="lane" style={{ minHeight: 0 }}>
                      <strong style={{ fontSize: 13 }}>{task.title}</strong>
                      <div className="metric-note" style={{ marginTop: 4 }}>
                        {task.priority.replaceAll("_", " ")} · due {fmtDate(task.dueDate)}
                      </div>
                      {task.status === "Blocked" && task.blockerReason ? (
                        <div className="pill red" style={{ marginTop: 6 }}>{task.blockerReason}</div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="empty" style={{ padding: 16 }}>No tasks.</div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {tasks.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>No tasks are currently recorded in your scope.</div>
      ) : null}
    </>
  );
}
