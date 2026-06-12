import { prisma } from "@/lib/prisma";
import { averageAgeDays, maxAgeDays } from "@/lib/metrics";
import { slaAssess, slaLabel } from "@/lib/sla";
import type { DashboardContext, DashboardData, DonutSegment, Tone } from "./types";

const CLOSED_STATUSES = ["Resolved", "Closed", "Cancelled"];
const DAY = 86_400_000;

function priorityTone(priority: string): Tone {
  if (priority === "WORK_STOPPAGE" || priority === "URGENT") return "red";
  if (priority === "HIGH") return "amber";
  return "blue";
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(d);
}

/**
 * Support Desk — helpdesk vitals over the existing Ticket model with the SLA
 * lens from the standalone Helpdesk app: per-priority response windows,
 * breach/at-risk queues, throughput, and resolution time. Pure operational
 * metadata (counts, hours, statuses).
 */
export async function loadSupportDesk(ctx: DashboardContext): Promise<DashboardData> {
  const org = ctx.organizationId;
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY);
  const where = { organizationId: org, archivedAt: null };

  const [openTickets, closed30, centers] = await Promise.all([
    prisma.ticket.findMany({
      where: { ...where, status: { notIn: CLOSED_STATUSES } },
      select: { id: true, ticketNumber: true, title: true, priority: true, status: true, createdAt: true, ticketCenterId: true },
      orderBy: { createdAt: "asc" },
      take: 2000
    }),
    prisma.ticket.findMany({
      where: { ...where, status: { in: CLOSED_STATUSES }, closedAt: { gte: since30 } },
      select: { priority: true, createdAt: true, closedAt: true },
      take: 2000
    }),
    prisma.ticketCenter.findMany({ where, select: { id: true, name: true } })
  ]);

  const centerName = new Map(centers.map((c) => [c.id, c.name]));

  // SLA assessment across the open queue.
  type Assessed = (typeof openTickets)[number] & { pct: number; state: string; label: string };
  const assessed: Assessed[] = openTickets.map((t) => {
    const a = slaAssess({ createdAtMs: t.createdAt.getTime(), priority: t.priority, nowMs: now });
    return { ...t, pct: a.pct, state: a.state, label: slaLabel(a) };
  });
  const breached = assessed.filter((t) => t.state === "breach");
  const atRisk = assessed.filter((t) => t.state === "risk");
  const workStoppage = openTickets.filter((t) => t.priority === "WORK_STOPPAGE").length;

  // Resolution time over the last 30 days (met-SLA share uses closed time).
  const resolutionHours = closed30
    .filter((t) => t.closedAt)
    .map((t) => (t.closedAt!.getTime() - t.createdAt.getTime()) / 3_600_000);
  const avgResolution = resolutionHours.length
    ? Math.round((resolutionHours.reduce((s, v) => s + v, 0) / resolutionHours.length) * 10) / 10
    : null;
  const metCount = closed30.filter((t) => {
    if (!t.closedAt) return false;
    const a = slaAssess({ createdAtMs: t.createdAt.getTime(), satisfiedAtMs: t.closedAt.getTime(), priority: t.priority, nowMs: now });
    return a.state !== "breach";
  }).length;
  const metRate = closed30.length ? Math.round((metCount / closed30.length) * 100) : null;

  const ages = openTickets.map((t) => t.createdAt.getTime());
  const avgAge = averageAgeDays(ages, now);
  const oldest = maxAgeDays(ages, now);

  // Status + priority mixes.
  const statusCounts = new Map<string, number>();
  for (const t of openTickets) statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
  const donut: DonutSegment[] = [...statusCounts.entries()]
    .map(([label, value]) => ({ label: `${label} (${value})`, value, tone: "blue" as Tone }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const priorityOrder = ["WORK_STOPPAGE", "URGENT", "HIGH", "NORMAL", "LOW"];
  const byPriority = priorityOrder
    .map((p) => ({ label: p.replaceAll("_", " "), value: openTickets.filter((t) => t.priority === p).length, tone: priorityTone(p) }))
    .filter((i) => i.value > 0);

  const byCenter = new Map<string, number>();
  for (const t of openTickets) {
    const name = centerName.get(t.ticketCenterId) ?? "Unassigned";
    byCenter.set(name, (byCenter.get(name) ?? 0) + 1);
  }

  const hotQueue = [...breached, ...atRisk].slice(0, 50);

  return {
    note: "SLA response windows by priority: work stoppage 1h · urgent 2h · high 4h · normal 24h · low 72h. Breach = open past the window; at risk = ≥ 75% of it. Triage at /tickets/board.",
    kpis: [
      { label: "Open tickets", value: openTickets.length, note: `${workStoppage} work stoppage`, tone: workStoppage > 0 ? "red" : "blue" },
      { label: "SLA breached", value: breached.length, note: "Open, past window", tone: breached.length > 0 ? "red" : "green" },
      { label: "SLA at risk", value: atRisk.length, note: "≥ 75% of window", tone: atRisk.length > 0 ? "amber" : "green" },
      { label: "SLA met (30d)", value: metRate === null ? "—" : `${metRate}%`, note: `${metCount}/${closed30.length} closed in window`, tone: metRate !== null && metRate >= 90 ? "green" : "amber" },
      { label: "Avg resolution (30d)", value: avgResolution === null ? "—" : `${avgResolution} h`, note: `${closed30.length} closed`, tone: "cyan" },
      { label: "Queue age", value: avgAge === null ? "—" : `${avgAge} d avg`, note: oldest === null ? "—" : `oldest ${oldest} d`, tone: oldest !== null && oldest > 14 ? "amber" : "blue" }
    ],
    widgets: [
      {
        kind: "table",
        id: "hot-queue",
        title: "Needs attention now (breached + at risk)",
        columns: [
          { key: "ticket", label: "Ticket" },
          { key: "title", label: "Title" },
          { key: "priority", label: "Priority" },
          { key: "status", label: "Status" },
          { key: "opened", label: "Opened" },
          { key: "sla", label: "SLA" }
        ],
        rows: hotQueue.map((t) => ({
          ticket: t.ticketNumber,
          title: t.title,
          priority: t.priority.replaceAll("_", " "),
          status: t.status,
          opened: fmtDate(t.createdAt),
          sla: t.label
        })),
        emptyLabel: "Nothing breached or at risk — queue is healthy."
      },
      { kind: "donut", id: "status-mix", title: "Open tickets by status", segments: donut },
      { kind: "bar", id: "by-priority", title: "Open tickets by priority", items: byPriority },
      {
        kind: "bar",
        id: "by-center",
        title: "Open tickets by ticket center",
        items: [...byCenter.entries()]
          .map(([label, value]) => ({ label, value, tone: "blue" as Tone }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 12)
      }
    ]
  };
}
