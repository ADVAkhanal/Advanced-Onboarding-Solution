import { prisma } from "@/lib/prisma";
import type { DashboardContext, DashboardData, Tone } from "./types";

// Placeholder nominal capacity per work center until a per-center capacity
// table exists. Tune later or source from a WorkCenter model.
const DEFAULT_WEEKLY_CAPACITY_HOURS = 40;

const DONE_OP_STATUSES = new Set(["DONE", "COMPLETE", "COMPLETED", "CANCELLED", "CLOSED"]);
const DONE_WO_STATUSES = ["DONE", "COMPLETE", "COMPLETED", "CANCELLED", "CLOSED", "SHIPPED"];

function loadTone(loadPct: number): Tone {
  if (loadPct > 100) return "red";
  if (loadPct >= 80) return "amber";
  return "green";
}

/**
 * AdvancedCapacity — remaining shop load by work center.
 * Reimagines ADVAkhanal/AdvancedCapacity over WorkOrderOperation hours.
 *
 * Assumption: an operation contributes remaining load when its own status
 * is not a done/cancelled state, regardless of parent work-order status.
 */
export async function loadAdvancedCapacity(ctx: DashboardContext): Promise<DashboardData> {
  const operations = await prisma.workOrderOperation.findMany({
    where: { organizationId: ctx.organizationId, archivedAt: null },
    select: { workCenter: true, setupHours: true, runHours: true, status: true },
    take: 10000
  });

  const overdueWos = await prisma.workOrder.count({
    where: {
      organizationId: ctx.organizationId,
      archivedAt: null,
      status: { notIn: DONE_WO_STATUSES },
      dueDate: { lt: new Date() }
    }
  });

  type Agg = { center: string; ops: number; setup: number; run: number };
  const byCenter = new Map<string, Agg>();
  for (const op of operations) {
    if (DONE_OP_STATUSES.has((op.status ?? "").toUpperCase())) continue;
    const center = op.workCenter || "Unassigned";
    const agg = byCenter.get(center) ?? { center, ops: 0, setup: 0, run: 0 };
    agg.ops += 1;
    agg.setup += op.setupHours ? Number(op.setupHours) : 0;
    agg.run += op.runHours ? Number(op.runHours) : 0;
    byCenter.set(center, agg);
  }

  const rows = [...byCenter.values()]
    .map((a) => ({ ...a, total: Math.round((a.setup + a.run) * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  const totalHours = Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100;
  const mostLoaded = rows[0];

  return {
    note: `Remaining load = open operation setup + run hours. Nominal capacity assumed at ${DEFAULT_WEEKLY_CAPACITY_HOURS} h/week per work center (placeholder until a per-center capacity table exists).`,
    kpis: [
      { label: "Open planned hours", value: `${totalHours} h`, note: `${rows.length} work centers`, tone: "blue" },
      { label: "Work centers loaded", value: rows.length, note: "With open operations", tone: "cyan" },
      {
        label: "Most-loaded center",
        value: mostLoaded ? mostLoaded.center : "—",
        note: mostLoaded ? `${mostLoaded.total} h` : "No load",
        tone: "amber"
      },
      { label: "Overdue work orders", value: overdueWos, note: "Past due, still open", tone: overdueWos > 0 ? "red" : "green" }
    ],
    widgets: [
      {
        kind: "bar",
        id: "load-by-center",
        title: "Remaining hours by work center",
        unit: "h",
        items: rows.map((r) => ({ label: r.center, value: r.total, tone: "blue" }))
      },
      {
        kind: "bar",
        id: "utilization",
        title: `Utilization vs ${DEFAULT_WEEKLY_CAPACITY_HOURS}h/week capacity`,
        unit: "%",
        items: rows.map((r) => {
          const pct = Math.round((r.total / DEFAULT_WEEKLY_CAPACITY_HOURS) * 100);
          return { label: r.center, value: pct, max: Math.max(100, pct), tone: loadTone(pct), hint: `${r.total} h` };
        })
      },
      {
        kind: "table",
        id: "load-breakdown",
        title: "Work center load breakdown",
        columns: [
          { key: "center", label: "Work center" },
          { key: "ops", label: "Open ops", numeric: true },
          { key: "setup", label: "Setup h", numeric: true },
          { key: "run", label: "Run h", numeric: true },
          { key: "total", label: "Total h", numeric: true },
          { key: "util", label: "Util %", numeric: true }
        ],
        rows: rows.map((r) => ({
          center: r.center,
          ops: r.ops,
          setup: Math.round(r.setup * 100) / 100,
          run: Math.round(r.run * 100) / 100,
          total: r.total,
          util: Math.round((r.total / DEFAULT_WEEKLY_CAPACITY_HOURS) * 100)
        })),
        emptyLabel: "No open operations."
      }
    ]
  };
}
