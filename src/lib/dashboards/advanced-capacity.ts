import { prisma } from "@/lib/prisma";
import type { DashboardContext, DashboardData, Tone } from "./types";

// Fallback when a work center has no capacity row configured.
const DEFAULT_WEEKLY_CAPACITY_HOURS = 40;

const DONE_OP_STATUSES = new Set(["DONE", "COMPLETE", "COMPLETED", "CANCELLED", "CLOSED"]);
const DONE_WO_STATUSES = ["DONE", "COMPLETE", "COMPLETED", "CANCELLED", "CLOSED", "SHIPPED"];

function loadTone(loadPct: number): Tone {
  if (loadPct > 100) return "red";
  if (loadPct >= 80) return "amber";
  return "green";
}

/**
 * AdvancedCapacity — remaining shop load vs configured capacity by work
 * center. Reimagines ADVAkhanal/AdvancedCapacity (an MPS capacity-vs-load
 * model: mps_workcenters capacity, util = load / cap) over live
 * WorkOrderOperation hours + the WorkCenter capacity table.
 *
 * Assumption: an operation contributes remaining load when its status is
 * not done/cancelled. Capacity comes from WorkCenter.capacityHoursPerWeek
 * (joined by code); centers with no row fall back to a nominal default.
 */
export async function loadAdvancedCapacity(ctx: DashboardContext): Promise<DashboardData> {
  const [operations, workCenters, overdueWos] = await Promise.all([
    prisma.workOrderOperation.findMany({
      where: { organizationId: ctx.organizationId, archivedAt: null },
      select: { workCenter: true, setupHours: true, runHours: true, status: true },
      take: 10000
    }),
    prisma.workCenter.findMany({
      where: { organizationId: ctx.organizationId, status: "ACTIVE", archivedAt: null },
      select: { code: true, capacityHoursPerWeek: true }
    }),
    prisma.workOrder.count({
      where: {
        organizationId: ctx.organizationId,
        archivedAt: null,
        status: { notIn: DONE_WO_STATUSES },
        dueDate: { lt: new Date() }
      }
    })
  ]);

  const capacityByCode = new Map(workCenters.map((w) => [w.code, Number(w.capacityHoursPerWeek)]));

  type Agg = { center: string; ops: number; setup: number; run: number; capacity: number; configured: boolean };
  const byCenter = new Map<string, Agg>();
  // Seed every configured center so capacity-only centers still appear.
  for (const w of workCenters) {
    byCenter.set(w.code, {
      center: w.code,
      ops: 0,
      setup: 0,
      run: 0,
      capacity: Number(w.capacityHoursPerWeek),
      configured: true
    });
  }
  for (const op of operations) {
    if (DONE_OP_STATUSES.has((op.status ?? "").toUpperCase())) continue;
    const center = op.workCenter || "Unassigned";
    const agg =
      byCenter.get(center) ??
      {
        center,
        ops: 0,
        setup: 0,
        run: 0,
        capacity: capacityByCode.get(center) ?? DEFAULT_WEEKLY_CAPACITY_HOURS,
        configured: capacityByCode.has(center)
      };
    agg.ops += 1;
    agg.setup += op.setupHours ? Number(op.setupHours) : 0;
    agg.run += op.runHours ? Number(op.runHours) : 0;
    byCenter.set(center, agg);
  }

  const rows = [...byCenter.values()]
    .map((a) => {
      const total = Math.round((a.setup + a.run) * 100) / 100;
      const util = a.capacity > 0 ? Math.round((total / a.capacity) * 100) : 0;
      return { ...a, total, util };
    })
    .sort((a, b) => b.util - a.util);

  const loadedRows = rows.filter((r) => r.total > 0);
  const totalHours = Math.round(loadedRows.reduce((s, r) => s + r.total, 0) * 100) / 100;
  const totalCapacity = Math.round(rows.reduce((s, r) => s + r.capacity, 0) * 100) / 100;
  const overallUtil = totalCapacity > 0 ? Math.round((totalHours / totalCapacity) * 100) : 0;
  const overloaded = rows.filter((r) => r.util > 100);

  return {
    note: `Remaining load = open operation setup + run hours. Capacity from configured work centers (manage at /erp/work-centers); unconfigured centers use a ${DEFAULT_WEEKLY_CAPACITY_HOURS} h/week default.`,
    kpis: [
      { label: "Open planned hours", value: `${totalHours} h`, note: `${loadedRows.length} loaded centers`, tone: "blue" },
      { label: "Weekly capacity", value: `${totalCapacity} h`, note: `${workCenters.length} configured`, tone: "cyan" },
      {
        label: "Overall utilization",
        value: `${overallUtil}%`,
        note: overloaded.length ? `${overloaded.length} over capacity` : "Within capacity",
        tone: loadTone(overallUtil)
      },
      { label: "Overdue work orders", value: overdueWos, note: "Past due, still open", tone: overdueWos > 0 ? "red" : "green" }
    ],
    widgets: [
      {
        kind: "bar",
        id: "utilization",
        title: "Utilization by work center (load ÷ capacity)",
        unit: "%",
        items: rows.map((r) => ({
          label: r.configured ? r.center : `${r.center} *`,
          value: r.util,
          max: Math.max(100, r.util),
          tone: loadTone(r.util),
          hint: `${r.total} h of ${r.capacity} h`
        }))
      },
      {
        kind: "bar",
        id: "load-by-center",
        title: "Remaining hours by work center",
        unit: "h",
        items: loadedRows.map((r) => ({ label: r.center, value: r.total, tone: "blue" }))
      },
      {
        kind: "table",
        id: "load-breakdown",
        title: "Work center load vs capacity",
        columns: [
          { key: "center", label: "Work center" },
          { key: "ops", label: "Open ops", numeric: true },
          { key: "total", label: "Load h", numeric: true },
          { key: "capacity", label: "Capacity h/wk", numeric: true },
          { key: "util", label: "Util %", numeric: true },
          { key: "source", label: "Capacity source" }
        ],
        rows: rows.map((r) => ({
          center: r.center,
          ops: r.ops,
          total: r.total,
          capacity: r.capacity,
          util: r.util,
          source: r.configured ? "Configured" : "Default 40"
        })),
        emptyLabel: "No work centers or operations yet."
      }
    ]
  };
}
