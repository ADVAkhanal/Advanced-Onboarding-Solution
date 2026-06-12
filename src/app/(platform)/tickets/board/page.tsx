import Link from "next/link";
import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slaAssess, slaLabel, slaPill } from "@/lib/sla";
import { TicketMoveForm } from "./ticket-move-form";

export const dynamic = "force-dynamic";

const CLOSED_STATUSES = ["Resolved", "Closed", "Cancelled"];

type Lane = { key: string; label: string };
const LANES: Lane[] = [
  { key: "new", label: "New" },
  { key: "progress", label: "In Progress" },
  { key: "waiting", label: "Waiting" },
  { key: "resolved", label: "Resolved" }
];

/** Map any ticket status (incl. legacy "Waiting on X" strings) to a lane. */
function laneFor(status: string): string {
  const s = status.toLowerCase();
  if (s.startsWith("waiting") || s === "blocked") return "waiting";
  if (s === "resolved" || s === "closed" || s === "cancelled") return "resolved";
  if (s === "new" || s === "reopened") return "new";
  return "progress"; // Assigned, In Progress, Escalated
}

function priorityPill(priority: string): string {
  if (priority === "WORK_STOPPAGE" || priority === "URGENT") return "red";
  if (priority === "HIGH") return "amber";
  return "";
}

export default async function TicketBoardPage() {
  const user = await requirePermission("ticket:view");
  const canManage = user.permissions.includes("ticket:manage");
  const now = Date.now();

  const ticketScope =
    user.userLevel === "USER"
      ? { OR: [{ requestedById: user.id }, { requestedForId: user.id }] }
      : departmentScopeForUser(user);

  // Open tickets + recently resolved (7d) so the Resolved lane shows motion.
  const since7d = new Date(now - 7 * 86_400_000);
  const tickets = await prisma.ticket.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      ...ticketScope,
      OR: [{ status: { notIn: CLOSED_STATUSES } }, { closedAt: { gte: since7d } }]
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 200
  });

  const byLane = new Map<string, typeof tickets>(LANES.map((l) => [l.key, [] as typeof tickets]));
  let breach = 0;
  let risk = 0;
  for (const t of tickets) {
    byLane.get(laneFor(t.status))!.push(t);
    if (!CLOSED_STATUSES.includes(t.status)) {
      const a = slaAssess({ createdAtMs: t.createdAt.getTime(), priority: t.priority, nowMs: now });
      if (a.state === "breach") breach += 1;
      else if (a.state === "risk") risk += 1;
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Tickets · Triage</p>
          <h1>Triage Board</h1>
          <p className="subhead">
            Open tickets by stage with live SLA chips (response windows by priority: work stoppage 1h,
            urgent 2h, high 4h, normal 24h, low 72h). Resolved shows the last 7 days.
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/erp/dashboards/support-desk">Support dashboard</Link>
          <Link className="button" href="/tickets">Ticket centers</Link>
        </div>
      </div>

      <div className="grid four-col" style={{ marginBottom: 14 }}>
        <section className="card kpi">
          <div className="metric-label">On board</div>
          <div>
            <div className="metric-value">{tickets.length}</div>
            <div className="metric-note">Open + resolved (7d)</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">SLA breached</div>
          <div>
            <div className={`metric-value ${breach > 0 ? "tone-red" : "tone-green"}`}>{breach}</div>
            <div className="metric-note">Open, past window</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">SLA at risk</div>
          <div>
            <div className={`metric-value ${risk > 0 ? "tone-amber" : "tone-green"}`}>{risk}</div>
            <div className="metric-note">≥ 75% of window</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Your role</div>
          <div>
            <div className="metric-value" style={{ fontSize: 18 }}>{canManage ? "Triage" : "View"}</div>
            <div className="metric-note">{canManage ? "Move tickets between stages" : "Read-only board"}</div>
          </div>
        </section>
      </div>

      <div className="status-lanes">
        {LANES.map((lane) => {
          const items = byLane.get(lane.key)!;
          return (
            <div className="lane" key={lane.key}>
              <strong>
                {lane.label} <span className="pill">{items.length}</span>
              </strong>
              {items.length === 0 ? (
                <div className="empty">Empty</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {items.slice(0, 30).map((t) => {
                    const open = !CLOSED_STATUSES.includes(t.status);
                    const a = slaAssess({
                      createdAtMs: t.createdAt.getTime(),
                      satisfiedAtMs: open ? null : t.closedAt?.getTime() ?? null,
                      priority: t.priority,
                      nowMs: now
                    });
                    return (
                      <div className="card" key={t.id} style={{ padding: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
                          <Link className="link" href={`/tickets/${t.id}`}>{t.ticketNumber}</Link>
                          <span className={`pill ${slaPill(a.state)}`} title={`${a.pct}% of a ${a.windowHours}h window`}>
                            {slaLabel(a)}
                          </span>
                        </div>
                        <div style={{ margin: "4px 0", fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <span className={`pill ${priorityPill(t.priority)}`}>{t.priority.replaceAll("_", " ")}</span>
                          <span className="pill">{t.status}</span>
                        </div>
                        {canManage && open ? <TicketMoveForm id={t.id} status={t.status} /> : null}
                      </div>
                    );
                  })}
                  {items.length > 30 ? <div className="metric-note">+ {items.length - 30} more — narrow via Ticket Centers.</div> : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
