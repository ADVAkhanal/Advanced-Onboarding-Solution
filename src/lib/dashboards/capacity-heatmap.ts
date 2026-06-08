import { prisma } from "@/lib/prisma";
import { utilizationPct } from "@/lib/metrics";
import type { DashboardContext, DashboardData, HeatmapCell, HeatmapRow, Tone } from "./types";

// Capacity a work center with no configured row falls back to.
const DEFAULT_WEEKLY_CAPACITY_HOURS = 40;
const WEEKS_PER_MONTH = 52 / 12; // ≈ 4.333
const HORIZON_MONTHS = 12;
const MAX_ROWS = 60;
const CRITICAL_UTIL = 150;

const DONE_OP_STATUSES = new Set(["DONE", "COMPLETE", "COMPLETED", "CANCELLED", "CLOSED"]);

function utilTone(util: number): Tone {
  if (util > 100) return "red";
  if (util >= 80) return "amber";
  return "green";
}

function monthLabel(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex, 1);
  const m = new Intl.DateTimeFormat("en", { month: "short" }).format(d);
  return `${m} '${String(year).slice(2)}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Capacity Heatmap — work-center × month utilization matrix.
 *
 * Reimagines the capacity-vs-load heatmaps from ADVAkhanal/AdvancedCapacity,
 * Scheduling, and the PK-GANT loaded-hours panel over live ERP data: open
 * operation hours (setup + run) bucketed into months by each operation's
 * scheduled start (or, when unscheduled, its work order's due date), divided
 * by the work center's configured monthly capacity (capacityHoursPerWeek ×
 * 52/12). Overdue load rolls into the current month.
 *
 * Operational metadata only — counts and hours. No part numbers, customers,
 * or controlled technical data appear here.
 */
export async function loadCapacityHeatmap(ctx: DashboardContext): Promise<DashboardData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const months: Array<{ label: string; year: number; month: number }> = [];
  for (let i = 0; i < HORIZON_MONTHS; i += 1) {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth() + i, 1);
    months.push({ label: monthLabel(d.getFullYear(), d.getMonth()), year: d.getFullYear(), month: d.getMonth() });
  }
  const horizonEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + HORIZON_MONTHS, 1);

  const [operations, workCenters] = await Promise.all([
    prisma.workOrderOperation.findMany({
      where: { organizationId: ctx.organizationId, archivedAt: null },
      select: { workCenter: true, setupHours: true, runHours: true, status: true, scheduledStart: true, workOrderId: true },
      take: 20000
    }),
    prisma.workCenter.findMany({
      where: { organizationId: ctx.organizationId, status: "ACTIVE", archivedAt: null },
      select: { code: true, capacityHoursPerWeek: true }
    })
  ]);

  const openOps = operations.filter((op) => !DONE_OP_STATUSES.has((op.status ?? "").toUpperCase()));

  // Resolve work-order due dates for operations without a scheduled start.
  const woIds = [...new Set(openOps.map((o) => o.workOrderId).filter((id): id is string => Boolean(id)))];
  const wos = woIds.length
    ? await prisma.workOrder.findMany({
        where: { organizationId: ctx.organizationId, id: { in: woIds } },
        select: { id: true, dueDate: true }
      })
    : [];
  const dueById = new Map(wos.map((w) => [w.id, w.dueDate]));

  const capByCode = new Map(workCenters.map((w) => [w.code, Number(w.capacityHoursPerWeek)]));
  const monthlyCapByCenter = (center: string) =>
    (capByCode.get(center) ?? DEFAULT_WEEKLY_CAPACITY_HOURS) * WEEKS_PER_MONTH;

  // center -> month index -> load hours
  const load = new Map<string, number[]>();
  const ensure = (center: string) => {
    let arr = load.get(center);
    if (!arr) {
      arr = new Array(HORIZON_MONTHS).fill(0) as number[];
      load.set(center, arr);
    }
    return arr;
  };
  // Seed configured centers so capacity-only centers still appear.
  for (const w of workCenters) ensure(w.code);

  let undatedHours = 0;
  let beyondHorizonHours = 0;

  for (const op of openOps) {
    const hours = (op.setupHours ? Number(op.setupHours) : 0) + (op.runHours ? Number(op.runHours) : 0);
    if (hours <= 0) continue;
    const center = op.workCenter || "Unassigned";
    const date = op.scheduledStart ?? (op.workOrderId ? dueById.get(op.workOrderId) ?? null : null);
    if (!date) {
      undatedHours += hours;
      continue;
    }
    if (date.getTime() >= horizonEnd.getTime()) {
      beyondHorizonHours += hours;
      continue;
    }
    let idx = (date.getFullYear() - monthStart.getFullYear()) * 12 + (date.getMonth() - monthStart.getMonth());
    if (idx < 0) idx = 0; // overdue load rolls into the current month
    ensure(center)[idx] += hours;
  }

  type Row = { center: string; cells: number[]; total: number; monthlyCap: number; overloaded: number; configured: boolean };
  const rowsRaw: Row[] = [];
  for (const [center, cells] of load.entries()) {
    const total = cells.reduce((s, v) => s + v, 0);
    const monthlyCap = monthlyCapByCenter(center);
    const overloaded = cells.filter((v) => monthlyCap > 0 && v / monthlyCap > 1).length;
    rowsRaw.push({ center, cells, total, monthlyCap, overloaded, configured: capByCode.has(center) });
  }
  // Show configured centers and any center carrying load; drop empty ad-hoc centers.
  const visible = rowsRaw
    .filter((r) => r.configured || r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_ROWS);

  const heatRows: HeatmapRow[] = visible.map((r) => {
    const cells: HeatmapCell[] = r.cells.map((hrs, i) => {
      if (hrs <= 0) return { value: null, title: `${r.center} · ${months[i].label}: no load` };
      if (r.monthlyCap <= 0) {
        return { value: 999, display: "∞", tone: "red", title: `${r.center} · ${months[i].label}: ${round1(hrs)} h, no capacity configured` };
      }
      const util = utilizationPct(hrs, r.monthlyCap);
      return {
        value: util,
        display: `${util}%`,
        tone: utilTone(util),
        title: `${r.center} · ${months[i].label}: ${round1(hrs)} h of ${round1(r.monthlyCap)} h (${util}%)`
      };
    });
    return {
      label: r.center,
      sublabel: r.configured ? undefined : "ad-hoc center (default capacity)",
      cells
    };
  });

  // Window aggregates.
  const windowLoad = visible.reduce((s, r) => s + r.total, 0);
  const windowCap = visible.reduce((s, r) => s + r.monthlyCap * HORIZON_MONTHS, 0);
  const windowUtil = utilizationPct(windowLoad, windowCap);
  const overloadedCells = visible.reduce((s, r) => s + r.overloaded, 0);
  const available = visible.reduce(
    (s, r) => s + r.cells.reduce((cs, hrs) => cs + Math.max(0, r.monthlyCap - hrs), 0),
    0
  );

  // Critical-overload alert line (> CRITICAL_UTIL).
  const critical: Array<{ center: string; label: string; util: number }> = [];
  for (const r of visible) {
    if (r.monthlyCap <= 0) continue;
    r.cells.forEach((hrs, i) => {
      if (hrs <= 0) return;
      const util = utilizationPct(hrs, r.monthlyCap);
      if (util > CRITICAL_UTIL) critical.push({ center: r.center, label: months[i].label, util });
    });
  }
  critical.sort((a, b) => b.util - a.util);
  const alertLine =
    critical.length > 0
      ? `⚠ ${critical.length} critical overload${critical.length > 1 ? "s" : ""} (>${CRITICAL_UTIL}%): ` +
        critical.slice(0, 3).map((c) => `${c.center} ${c.label} @ ${c.util}%`).join(" · ") +
        (critical.length > 3 ? ` + ${critical.length - 3} more. ` : ". ")
      : "";

  const extras: string[] = [];
  if (undatedHours > 0) extras.push(`${round1(undatedHours)} h of open load is undated (no schedule or due date) and excluded from the matrix.`);
  if (beyondHorizonHours > 0) extras.push(`${round1(beyondHorizonHours)} h is scheduled beyond the ${HORIZON_MONTHS}-month horizon.`);

  return {
    note:
      `${alertLine}Load = open operation setup + run hours bucketed by month (operation scheduled start, else work-order due date; overdue rolls into the current month). ` +
      `Capacity = work-center capacityHoursPerWeek × 52/12 (manage at /erp/work-centers; ad-hoc centers use a ${DEFAULT_WEEKLY_CAPACITY_HOURS} h/week default).` +
      (extras.length ? ` ${extras.join(" ")}` : ""),
    kpis: [
      { label: "Effective capacity", value: `${Math.round(windowCap).toLocaleString()} h`, note: `${HORIZON_MONTHS}-mo · ${visible.length} centers`, tone: "cyan" },
      { label: "Loaded hours", value: `${Math.round(windowLoad).toLocaleString()} h`, note: "Open setup + run, in window", tone: "blue" },
      {
        label: "Utilization",
        value: `${windowUtil}%`,
        note: overloadedCells ? `${overloadedCells} WC-months over capacity` : "Within capacity",
        tone: utilTone(windowUtil)
      },
      { label: "Unscheduled capacity", value: `${Math.round(available).toLocaleString()} h`, note: "Available in window", tone: "green" }
    ],
    widgets: [
      {
        kind: "heatmap",
        id: "util-heatmap",
        title: "Utilization by work center × month",
        rowHeader: "Work center",
        columns: months.map((m) => m.label),
        rows: heatRows,
        legend: [
          { label: "< 80%", tone: "green" },
          { label: "80–99%", tone: "amber" },
          { label: "≥ 100% (over capacity)", tone: "red" }
        ],
        emptyLabel: "No open operations with hours to schedule."
      },
      {
        kind: "bar",
        id: "load-by-center",
        title: "Loaded hours by work center (12-month window)",
        unit: "h",
        items: visible
          .filter((r) => r.total > 0)
          .map((r) => ({ label: r.center, value: round1(r.total), tone: "blue" as Tone }))
      },
      {
        kind: "table",
        id: "capacity-summary",
        title: "Work-center capacity summary (12-month window)",
        columns: [
          { key: "center", label: "Work center" },
          { key: "load", label: "Load h", numeric: true },
          { key: "capacity", label: "Capacity h", numeric: true },
          { key: "util", label: "Util %", numeric: true },
          { key: "over", label: "Months over", numeric: true },
          { key: "available", label: "Available h", numeric: true }
        ],
        rows: visible.map((r) => {
          const cap = r.monthlyCap * HORIZON_MONTHS;
          return {
            center: r.configured ? r.center : `${r.center} *`,
            load: round1(r.total),
            capacity: Math.round(cap),
            util: utilizationPct(r.total, cap),
            over: r.overloaded,
            available: Math.round(Math.max(0, cap - r.total))
          };
        }),
        emptyLabel: "No work centers configured yet."
      }
    ]
  };
}
