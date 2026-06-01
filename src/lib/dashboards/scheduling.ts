import { prisma } from "@/lib/prisma";
import type { DashboardContext, DashboardData, DonutSegment, Tone } from "./types";

const DONE_STATUSES = new Set(["DONE", "COMPLETE", "COMPLETED", "CANCELLED", "CLOSED"]);

function statusTone(status: string): Tone {
  const s = status.toUpperCase();
  if (s === "IN_PROGRESS" || s === "RUNNING") return "blue";
  if (DONE_STATUSES.has(s)) return "green";
  if (s === "BLOCKED" || s === "LATE") return "red";
  return "cyan";
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(d);
}

/**
 * Scheduling — near-term shop schedule health.
 * Reimagines ADVAkhanal/Scheduling over ShopScheduleItem.
 */
export async function loadScheduling(ctx: DashboardContext): Promise<DashboardData> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in7 = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const where = { organizationId: ctx.organizationId, archivedAt: null };

  const [upcoming, statusGroups, centerGroups, priorityGroups, lateCount, inProgress] = await Promise.all([
    prisma.shopScheduleItem.findMany({
      where: { ...where, scheduleDate: { gte: todayStart, lt: in7 } },
      orderBy: [{ scheduleDate: "asc" }, { priority: "desc" }],
      take: 50,
      select: { id: true, workCenter: true, scheduleDate: true, status: true, priority: true, workOrderId: true }
    }),
    prisma.shopScheduleItem.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.shopScheduleItem.groupBy({ by: ["workCenter"], where, _count: { _all: true } }),
    prisma.shopScheduleItem.groupBy({ by: ["priority"], where, _count: { _all: true } }),
    prisma.shopScheduleItem.count({
      where: { ...where, scheduleDate: { lt: todayStart }, status: { notIn: [...DONE_STATUSES] } }
    }),
    prisma.shopScheduleItem.count({ where: { ...where, status: "IN_PROGRESS" } })
  ]);

  // Resolve work order numbers for the upcoming list (loose FK).
  const woIds = upcoming.map((i) => i.workOrderId).filter((id): id is string => Boolean(id));
  const wos = woIds.length
    ? await prisma.workOrder.findMany({
        where: { organizationId: ctx.organizationId, id: { in: woIds } },
        select: { id: true, workOrderNumber: true }
      })
    : [];
  const woNumber = new Map(wos.map((w) => [w.id, w.workOrderNumber]));

  const donutSegments: DonutSegment[] = statusGroups
    .filter((g) => g._count._all > 0)
    .map((g) => ({ label: `${g.status} (${g._count._all})`, value: g._count._all, tone: statusTone(g.status) }));

  const centerItems = [...centerGroups]
    .map((g) => ({ label: g.workCenter || "Unassigned", value: g._count._all, tone: "blue" as Tone }))
    .sort((a, b) => b.value - a.value);

  return {
    kpis: [
      { label: "Next 7 days", value: upcoming.length, note: "Scheduled items", tone: "blue" },
      { label: "Late", value: lateCount, note: "Past date, not done", tone: lateCount > 0 ? "red" : "green" },
      { label: "In progress", value: inProgress, note: "Currently running", tone: "cyan" },
      { label: "Work centers", value: centerItems.length, note: "With scheduled work", tone: "blue" }
    ],
    widgets: [
      {
        kind: "table",
        id: "upcoming",
        title: "Upcoming schedule (next 7 days)",
        columns: [
          { key: "date", label: "Date" },
          { key: "center", label: "Work center" },
          { key: "wo", label: "Work order" },
          { key: "status", label: "Status" },
          { key: "priority", label: "Priority" }
        ],
        rows: upcoming.map((i) => ({
          date: fmtDate(i.scheduleDate),
          center: i.workCenter || "Unassigned",
          wo: i.workOrderId ? woNumber.get(i.workOrderId) ?? "—" : "—",
          status: i.status,
          priority: i.priority.replaceAll("_", " ")
        })),
        emptyLabel: "Nothing scheduled in the next 7 days."
      },
      {
        kind: "bar",
        id: "by-center",
        title: "Scheduled items by work center",
        items: centerItems
      },
      {
        kind: "donut",
        id: "status-mix",
        title: "Schedule status mix",
        segments: donutSegments
      },
      {
        kind: "bar",
        id: "by-priority",
        title: "Scheduled items by priority",
        items: ["WORK_STOPPAGE", "URGENT", "HIGH", "NORMAL", "LOW"]
          .map((p) => {
            const g = priorityGroups.find((row) => row.priority === p);
            const count = g ? g._count._all : 0;
            const tone: Tone = p === "WORK_STOPPAGE" || p === "URGENT" ? "red" : p === "HIGH" ? "amber" : "blue";
            return { label: p.replaceAll("_", " "), value: count, tone };
          })
          .filter((i) => i.value > 0)
      }
    ]
  };
}
