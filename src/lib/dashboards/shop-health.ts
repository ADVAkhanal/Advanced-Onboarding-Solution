import { prisma } from "@/lib/prisma";
import { averageAgeDays, maxAgeDays, onTimeRate, reworkRate, utilizationPct } from "@/lib/metrics";
import type { DashboardContext, DashboardData, Tone } from "./types";

const DONE_OP = new Set(["DONE", "COMPLETE", "COMPLETED", "CANCELLED", "CLOSED"]);
const DONE_WO = ["DONE", "COMPLETE", "COMPLETED", "CANCELLED", "CLOSED", "SHIPPED"];
const DONE_INSPECTION = new Set(["DONE", "COMPLETE", "COMPLETED", "CLOSED", "CANCELLED"]);
const DEFAULT_CAP = 40;

function utilTone(pct: number): Tone {
  if (pct > 100) return "red";
  if (pct >= 80) return "amber";
  return "green";
}

function fmtDate(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(d) : "—";
}

/**
 * Shop Floor Health — the operational vitals in one place: utilization,
 * remaining time, late risk, bottlenecks, rework rate, inspection queue
 * aging, and schedule adherence. Formulas live in lib/metrics (tested).
 */
export async function loadShopHealth(ctx: DashboardContext): Promise<DashboardData> {
  const org = ctx.organizationId;
  const now = new Date();
  const nowMs = now.getTime();
  const in7 = new Date(nowMs + 7 * 24 * 60 * 60 * 1000);
  const since90 = new Date(nowMs - 90 * 24 * 60 * 60 * 1000);

  const [operations, workCenters, openWos, openInspections, openNcrs, decidedInspections, completedOps] =
    await Promise.all([
      prisma.workOrderOperation.findMany({
        where: { organizationId: org, archivedAt: null },
        select: { workCenter: true, runHours: true, setupHours: true, status: true },
        take: 10000
      }),
      prisma.workCenter.findMany({
        where: { organizationId: org, status: "ACTIVE", archivedAt: null },
        select: { code: true, capacityHoursPerWeek: true }
      }),
      prisma.workOrder.findMany({
        where: { organizationId: org, archivedAt: null, status: { notIn: DONE_WO }, dueDate: { not: null } },
        select: { workOrderNumber: true, dueDate: true, status: true },
        take: 2000
      }),
      prisma.qualityInspection.findMany({
        where: { organizationId: org, archivedAt: null, status: { notIn: [...DONE_INSPECTION] } },
        select: { createdAt: true },
        take: 5000
      }),
      prisma.nonconformanceRecord.count({
        where: { organizationId: org, archivedAt: null, status: { notIn: ["CLOSED", "RESOLVED", "CANCELLED"] } }
      }),
      prisma.qualityInspection.findMany({
        where: { organizationId: org, archivedAt: null, result: { not: null } },
        select: { result: true },
        take: 5000
      }),
      prisma.workOrderOperation.findMany({
        where: { organizationId: org, archivedAt: null, completedAt: { gte: since90 } },
        select: { completedAt: true, workOrderId: true },
        take: 5000
      })
    ]);

  // Utilization + bottlenecks + remaining time.
  const capByCode = new Map(workCenters.map((w) => [w.code, Number(w.capacityHoursPerWeek)]));
  const loadByCenter = new Map<string, number>();
  let remainingRunHours = 0;
  for (const op of operations) {
    if (DONE_OP.has((op.status ?? "").toUpperCase())) continue;
    const center = op.workCenter || "Unassigned";
    const hrs = (op.setupHours ? Number(op.setupHours) : 0) + (op.runHours ? Number(op.runHours) : 0);
    loadByCenter.set(center, (loadByCenter.get(center) ?? 0) + hrs);
    remainingRunHours += op.runHours ? Number(op.runHours) : 0;
  }
  const totalLoad = [...loadByCenter.values()].reduce((a, b) => a + b, 0);
  const totalCap = workCenters.reduce((s, w) => s + Number(w.capacityHoursPerWeek), 0) || 0;
  const overallUtil = utilizationPct(Math.round(totalLoad), Math.round(totalCap || DEFAULT_CAP));
  const bottlenecks = [...loadByCenter.entries()]
    .map(([center, load]) => {
      const cap = capByCode.get(center) ?? DEFAULT_CAP;
      return { center, load: Math.round(load * 10) / 10, util: utilizationPct(load, cap) };
    })
    .sort((a, b) => b.util - a.util)
    .slice(0, 8);

  // Late risk.
  const overdue = openWos.filter((w) => w.dueDate && w.dueDate.getTime() < nowMs);
  const dueSoon = openWos.filter((w) => w.dueDate && w.dueDate.getTime() >= nowMs && w.dueDate.getTime() <= in7.getTime());

  // Rework / reject rate from decided inspections.
  let fail = 0;
  let decided = 0;
  for (const i of decidedInspections) {
    const r = (i.result ?? "").toUpperCase();
    const isFail = r.includes("FAIL") || r.includes("REJECT") || r.includes("NONCONFORM");
    const isPass = r.includes("PASS") || r.includes("ACCEPT") || r.includes("OK");
    if (isFail) {
      fail += 1;
      decided += 1;
    } else if (isPass) {
      decided += 1;
    }
  }
  const rejectRate = reworkRate(fail, decided);

  // Inspection queue aging.
  const inspectionAges = openInspections.map((i) => i.createdAt.getTime());
  const avgAge = averageAgeDays(inspectionAges, nowMs);
  const oldestAge = maxAgeDays(inspectionAges, nowMs);

  // Schedule adherence: completed ops (90d) vs their work order's due date.
  const completedWoIds = [...new Set(completedOps.map((o) => o.workOrderId).filter((x): x is string => Boolean(x)))];
  const dueByWo = new Map<string, number | null>();
  if (completedWoIds.length) {
    const wos = await prisma.workOrder.findMany({
      where: { organizationId: org, id: { in: completedWoIds } },
      select: { id: true, dueDate: true }
    });
    for (const w of wos) dueByWo.set(w.id, w.dueDate ? w.dueDate.getTime() : null);
  }
  const adherence = onTimeRate(
    completedOps
      .filter((o) => o.completedAt && o.workOrderId)
      .map((o) => ({ completedAtMs: o.completedAt!.getTime(), dueMs: dueByWo.get(o.workOrderId as string) ?? null }))
  );

  return {
    note: "Operational vitals across capacity, schedule, and quality. Utilization uses configured work-center capacity; schedule adherence compares completed operations (90d) to their work order due dates.",
    kpis: [
      { label: "Utilization", value: `${overallUtil}%`, note: "Load ÷ capacity", tone: utilTone(overallUtil) },
      { label: "Remaining run hours", value: `${Math.round(remainingRunHours)} h`, note: "Open operations", tone: "blue" },
      { label: "Late risk", value: overdue.length + dueSoon.length, note: `${overdue.length} overdue · ${dueSoon.length} due ≤7d`, tone: overdue.length ? "red" : dueSoon.length ? "amber" : "green" },
      { label: "Schedule adherence", value: adherence === null ? "—" : `${adherence}%`, note: "Ops on time (90d)", tone: adherence !== null && adherence >= 90 ? "green" : adherence !== null && adherence >= 75 ? "amber" : "red" },
      { label: "Reject rate", value: rejectRate === null ? "—" : `${rejectRate}%`, note: `${fail}/${decided} inspections`, tone: rejectRate !== null && rejectRate <= 5 ? "green" : rejectRate !== null && rejectRate <= 15 ? "amber" : "red" },
      { label: "Open NCRs", value: openNcrs, note: "Rework signal", tone: openNcrs > 0 ? "amber" : "green" },
      { label: "Inspection queue age", value: avgAge === null ? "—" : `${avgAge}d avg`, note: oldestAge === null ? "Queue empty" : `${oldestAge}d oldest`, tone: avgAge !== null && avgAge > 7 ? "amber" : "green" }
    ],
    widgets: [
      {
        kind: "bar",
        id: "bottlenecks",
        title: "Bottlenecks — utilization by work center",
        unit: "%",
        items: bottlenecks.map((b) => ({ label: b.center, value: b.util, max: Math.max(100, b.util), tone: utilTone(b.util), hint: `${b.load} h` }))
      },
      {
        kind: "table",
        id: "late-risk",
        title: "Late-risk work orders (overdue + due within 7 days)",
        columns: [
          { key: "wo", label: "Work order" },
          { key: "status", label: "Status" },
          { key: "due", label: "Due" },
          { key: "risk", label: "Risk" }
        ],
        rows: [...overdue, ...dueSoon].slice(0, 100).map((w) => ({
          wo: w.workOrderNumber,
          status: w.status,
          due: fmtDate(w.dueDate),
          risk: w.dueDate && w.dueDate.getTime() < nowMs ? "OVERDUE" : "Due soon"
        })),
        emptyLabel: "No late-risk work orders."
      }
    ]
  };
}
