import { prisma } from "@/lib/prisma";
import type { DashboardContext, DashboardData, GanttRow, Tone } from "./types";

const DONE_OP_STATUSES = new Set(["DONE", "COMPLETE", "COMPLETED", "CANCELLED", "CLOSED"]);

function opTone(status: string, endMs: number, nowMs: number): Tone {
  const s = (status || "").toUpperCase();
  if (DONE_OP_STATUSES.has(s)) return "green";
  if (endMs < nowMs) return "red"; // overdue
  if (s === "IN_PROGRESS" || s === "RUNNING") return "blue";
  return "cyan";
}

function fmtDay(ms: number): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(ms));
}

function fmtDateTime(ms: number): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}

/**
 * PK-GANT — production Gantt timeline of scheduled operations.
 * Reimagines ADVAkhanal/PK-GANT over WorkOrderOperation scheduled
 * start/end using the engine's CSS gantt widget (no charting dependency).
 */
export async function loadPkGant(ctx: DashboardContext): Promise<DashboardData> {
  const now = new Date();
  const nowMs = now.getTime();

  const operations = await prisma.workOrderOperation.findMany({
    where: {
      organizationId: ctx.organizationId,
      archivedAt: null,
      scheduledStart: { not: null }
    },
    orderBy: { scheduledStart: "asc" },
    take: 60,
    select: {
      id: true,
      workOrderId: true,
      workCenter: true,
      operationNumber: true,
      description: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true
    }
  });

  const woIds = operations.map((o) => o.workOrderId).filter((id): id is string => Boolean(id));
  const wos = woIds.length
    ? await prisma.workOrder.findMany({
        where: { organizationId: ctx.organizationId, id: { in: woIds } },
        select: { id: true, workOrderNumber: true }
      })
    : [];
  const woNumber = new Map(wos.map((w) => [w.id, w.workOrderNumber]));

  // Build rows with resolved start/end (default end = start + 2h if missing).
  const built = operations.map((o) => {
    const startMs = o.scheduledStart!.getTime();
    const endMs = o.scheduledEnd ? o.scheduledEnd.getTime() : startMs + 2 * 60 * 60 * 1000;
    const wo = o.workOrderId ? woNumber.get(o.workOrderId) ?? "WO" : "WO";
    return {
      id: o.id,
      label: `${wo} · op ${o.operationNumber}`,
      sublabel: `${o.workCenter} — ${o.description}`,
      workCenter: o.workCenter,
      status: o.status,
      startMs,
      endMs
    };
  });

  const hasData = built.length > 0;
  const windowStartMs = hasData ? Math.min(...built.map((b) => b.startMs)) : nowMs;
  const windowEndMs = hasData
    ? Math.max(...built.map((b) => b.endMs), windowStartMs + 24 * 60 * 60 * 1000)
    : nowMs + 14 * 24 * 60 * 60 * 1000;

  const TICKS = 5;
  const ticks = Array.from({ length: TICKS }, (_unused, i) =>
    fmtDay(windowStartMs + ((windowEndMs - windowStartMs) * i) / (TICKS - 1))
  );

  const ganttRows: GanttRow[] = built.map((b) => ({
    label: b.label,
    sublabel: b.sublabel,
    startMs: b.startMs,
    endMs: b.endMs,
    tone: opTone(b.status, b.endMs, nowMs)
  }));

  const overdue = built.filter((b) => b.endMs < nowMs && !DONE_OP_STATUSES.has((b.status || "").toUpperCase())).length;

  return {
    note: "Timeline of scheduled work-order operations. Operations missing a scheduled end default to a 2-hour block.",
    kpis: [
      { label: "Scheduled operations", value: built.length, note: "With a start time", tone: "blue" },
      { label: "Window start", value: hasData ? fmtDay(windowStartMs) : "—", note: "Earliest start", tone: "cyan" },
      { label: "Window end", value: hasData ? fmtDay(windowEndMs) : "—", note: "Latest finish", tone: "cyan" },
      { label: "Overdue operations", value: overdue, note: "End in the past, not done", tone: overdue > 0 ? "red" : "green" }
    ],
    widgets: [
      {
        kind: "gantt",
        id: "timeline",
        title: "Operation timeline",
        windowStartMs,
        windowEndMs,
        ticks,
        rows: ganttRows
      },
      {
        kind: "table",
        id: "operations",
        title: "Scheduled operations",
        columns: [
          { key: "op", label: "Operation" },
          { key: "center", label: "Work center" },
          { key: "start", label: "Start" },
          { key: "end", label: "End" },
          { key: "status", label: "Status" }
        ],
        rows: built.map((b) => ({
          op: b.label,
          center: b.workCenter,
          start: fmtDateTime(b.startMs),
          end: fmtDateTime(b.endMs),
          status: b.status
        })),
        emptyLabel: "No scheduled operations with start times."
      }
    ]
  };
}
