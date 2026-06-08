import { prisma } from "@/lib/prisma";
import type { DashboardContext, DashboardData, DonutSegment, Tone } from "./types";

const DAY = 86_400_000;

function machineStatusTone(status: string): Tone {
  if (status === "down") return "red";
  if (status === "pm") return "amber";
  if (status === "running") return "green";
  return "cyan";
}

function woStatusTone(status: string): Tone {
  if (status === "DONE") return "green";
  if (status === "IN_PROGRESS") return "amber";
  if (status === "ASSIGNED") return "cyan";
  return "blue";
}

/**
 * Maintenance Health — operational vitals for the CMMS module: uptime,
 * machines down, open + overdue work orders, PM overdue, downtime hours, MRO
 * low stock, and top problem machines. Reimagines the "Reports" view of the
 * standalone Maintenance Command app over the Machine / MaintenanceWorkOrder /
 * PmTask / PmCompletion / MaintenanceDowntimeEvent / MaintenancePart models.
 */
export async function loadMaintenanceHealth(ctx: DashboardContext): Promise<DashboardData> {
  const org = ctx.organizationId;
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const where = { organizationId: org, archivedAt: null };

  const [machines, openWOs, woStatusGroups, pmActive, pmOverdue, completions30, closed30, downtime, parts] =
    await Promise.all([
      prisma.machine.findMany({ where, select: { id: true, code: true, name: true, status: true, category: true }, take: 1000 }),
      prisma.maintenanceWorkOrder.findMany({
        where: { ...where, status: { not: "DONE" } },
        select: { id: true, machineId: true, dueDate: true },
        take: 2000
      }),
      prisma.maintenanceWorkOrder.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.pmTask.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.pmTask.count({ where: { ...where, status: "ACTIVE", nextDueAt: { lt: now } } }),
      prisma.pmCompletion.count({ where: { organizationId: org, archivedAt: null, completedAt: { gte: since30 } } }),
      prisma.maintenanceWorkOrder.count({ where: { ...where, status: "DONE", closedAt: { gte: since30 } } }),
      prisma.maintenanceDowntimeEvent.findMany({ where: { ...where, startAt: { gte: since30 } }, select: { machineId: true, hours: true }, take: 5000 }),
      prisma.maintenancePart.findMany({ where, select: { name: true, subCategory: true, category: true, quantityOnHand: true, reorderPoint: true, critical: true }, take: 3000 })
    ]);

  const mById = new Map(machines.map((m) => [m.id, m]));
  const running = machines.filter((m) => m.status === "running").length;
  const down = machines.filter((m) => m.status === "down").length;
  const inPm = machines.filter((m) => m.status === "pm").length;
  const uptime = machines.length ? Math.round((running / machines.length) * 100) : 0;
  const overdueWo = openWOs.filter((w) => w.dueDate && w.dueDate.getTime() < now.getTime()).length;
  const lowParts = parts.filter((p) => p.quantityOnHand <= p.reorderPoint);
  const critLow = lowParts.filter((p) => p.critical).length;
  const downtimeHours = downtime.reduce((s, e) => s + (e.hours ? Number(e.hours) : 0), 0);

  // Top problem machines: downtime hours + open work-order count.
  type Prob = { code: string; name: string; dtHours: number; dtCount: number; openWo: number };
  const prob = new Map<string, Prob>();
  const ensure = (id: string) => {
    let p = prob.get(id);
    if (!p) {
      const m = mById.get(id);
      p = { code: m?.code ?? "—", name: m?.name ?? "(unknown)", dtHours: 0, dtCount: 0, openWo: 0 };
      prob.set(id, p);
    }
    return p;
  };
  for (const e of downtime) {
    if (!e.machineId) continue;
    const p = ensure(e.machineId);
    p.dtHours += e.hours ? Number(e.hours) : 0;
    p.dtCount += 1;
  }
  for (const w of openWOs) {
    if (!w.machineId) continue;
    ensure(w.machineId).openWo += 1;
  }
  const topProblems = [...prob.values()]
    .map((p) => ({ ...p, score: p.dtHours + p.openWo * 2 }))
    .filter((p) => p.dtHours > 0 || p.openWo > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Machines by status (bar).
  const statusOrder = ["running", "down", "pm", "idle", "moving"];
  const byStatus = statusOrder
    .map((s) => ({ s, n: machines.filter((m) => m.status === s).length }))
    .filter((x) => x.n > 0);

  const woDonut: DonutSegment[] = woStatusGroups
    .filter((g) => g._count._all > 0)
    .map((g) => ({ label: `${g.status.replaceAll("_", " ")} (${g._count._all})`, value: g._count._all, tone: woStatusTone(g.status) }));

  return {
    note: `Operational metadata only. PM "overdue" = active PM tasks with a next-due date in the past. Downtime and work-order metrics cover the last 30 days. Manage machines, PM, and parts under Maintenance.`,
    kpis: [
      { label: "Shop uptime", value: `${uptime}%`, note: `${running}/${machines.length} running · ${inPm} in PM`, tone: uptime >= 80 ? "green" : uptime >= 60 ? "amber" : "red" },
      { label: "Machines down", value: down, note: down ? "Needs attention" : "All systems go", tone: down > 0 ? "red" : "green" },
      { label: "Open work orders", value: openWOs.length, note: `${overdueWo} overdue · ${closed30} closed (30d)`, tone: overdueWo > 0 ? "red" : "blue" },
      { label: "PM overdue", value: pmOverdue, note: `${pmActive} active · ${completions30} done (30d)`, tone: pmOverdue > 0 ? "red" : "green" },
      { label: "MRO low stock", value: lowParts.length, note: `${critLow} critical`, tone: lowParts.length > 0 ? "amber" : "green" },
      { label: "Downtime (30d)", value: `${Math.round(downtimeHours * 10) / 10} h`, note: `${downtime.length} events`, tone: downtimeHours > 0 ? "amber" : "green" }
    ],
    widgets: [
      {
        kind: "bar",
        id: "machines-by-status",
        title: "Machines by status",
        items: byStatus.map((x) => ({ label: x.s === "down" ? "Down" : x.s.charAt(0).toUpperCase() + x.s.slice(1), value: x.n, tone: machineStatusTone(x.s) }))
      },
      {
        kind: "donut",
        id: "wo-status-mix",
        title: "Work order status mix",
        segments: woDonut
      },
      {
        kind: "bar",
        id: "downtime-by-machine",
        title: "Top problem machines — downtime hours (30d)",
        unit: "h",
        items: topProblems.filter((p) => p.dtHours > 0).map((p) => ({ label: p.code, value: Math.round(p.dtHours * 10) / 10, tone: "red" as Tone, hint: p.name }))
      },
      {
        kind: "table",
        id: "problem-machines",
        title: "Top problem machines (30d)",
        columns: [
          { key: "machine", label: "Machine" },
          { key: "dtHours", label: "Downtime h", numeric: true },
          { key: "dtCount", label: "DT events", numeric: true },
          { key: "openWo", label: "Open WOs", numeric: true }
        ],
        rows: topProblems.map((p) => ({ machine: `${p.code} · ${p.name}`, dtHours: Math.round(p.dtHours * 10) / 10, dtCount: p.dtCount, openWo: p.openWo })),
        emptyLabel: "No downtime or open work orders logged."
      },
      {
        kind: "table",
        id: "low-mro",
        title: "Low MRO stock",
        columns: [
          { key: "item", label: "Item" },
          { key: "category", label: "Category" },
          { key: "onHand", label: "On hand", numeric: true },
          { key: "reorder", label: "Reorder at", numeric: true },
          { key: "flag", label: "Flag" }
        ],
        rows: lowParts
          .sort((a, b) => Number(b.critical) - Number(a.critical))
          .slice(0, 50)
          .map((p) => ({ item: p.name, category: p.subCategory ?? p.category ?? "—", onHand: p.quantityOnHand, reorder: p.reorderPoint, flag: p.critical ? "CRITICAL" : "low" })),
        emptyLabel: "All MRO items above reorder point."
      }
    ]
  };
}
