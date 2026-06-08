import { prisma } from "@/lib/prisma";
import type { DashboardContext, DashboardData, DonutSegment, Tone } from "./types";

const DONE_INSPECTION = new Set(["DONE", "COMPLETE", "COMPLETED", "CLOSED", "CANCELLED"]);

function resultBucket(result: string | null): "PASS" | "FAIL" | "PENDING" {
  const r = (result ?? "").toUpperCase();
  if (r.includes("PASS") || r.includes("ACCEPT") || r.includes("OK")) return "PASS";
  if (r.includes("FAIL") || r.includes("REJECT") || r.includes("NONCONFORM")) return "FAIL";
  return "PENDING";
}

function severityTone(sev: string): Tone {
  const s = sev.toUpperCase();
  if (s === "CRITICAL" || s === "HIGH") return "red";
  if (s === "MEDIUM") return "amber";
  return "cyan";
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

/**
 * First-Piece-Run-Tracker — first-article / FAIR inspection health + NCRs.
 * Reimagines ADVAkhanal/First-Piece-Run-Tracker over QualityInspection
 * and NonconformanceRecord. AS9102 first-article context.
 */
export async function loadFirstPiece(ctx: DashboardContext): Promise<DashboardData> {
  const now = new Date();
  const where = { organizationId: ctx.organizationId, archivedAt: null };

  // First-article inspections: type mentions "first" or "FAI". If none match,
  // fall back to all inspections so the dashboard is still useful.
  const firstArticleWhere = {
    ...where,
    OR: [
      { inspectionType: { contains: "first", mode: "insensitive" as const } },
      { inspectionType: { contains: "fai", mode: "insensitive" as const } },
      { inspectionType: { contains: "article", mode: "insensitive" as const } }
    ]
  };

  const inspectionSelect = {
    id: true,
    inspectionNumber: true,
    partId: true,
    workOrderId: true,
    inspectionType: true,
    result: true,
    status: true,
    dueDate: true,
    createdAt: true
  } as const;

  let inspections = await prisma.qualityInspection.findMany({
    where: firstArticleWhere,
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: 500,
    select: inspectionSelect
  });
  let scopedToFirstArticle = true;
  if (inspections.length === 0) {
    scopedToFirstArticle = false;
    inspections = await prisma.qualityInspection.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 500,
      select: inspectionSelect
    });
  }

  // First Pass Yield: did the FIRST inspection of each work order pass?
  // QualityInspection has no per-run number, so the earliest inspection per
  // work order is the proxy for the first run. FPY = firstPass / decided.
  const firstByWo = new Map<string, { result: string | null; createdAt: Date }>();
  for (const i of inspections) {
    if (!i.workOrderId) continue;
    const prev = firstByWo.get(i.workOrderId);
    if (!prev || i.createdAt.getTime() < prev.createdAt.getTime()) {
      firstByWo.set(i.workOrderId, { result: i.result, createdAt: i.createdAt });
    }
  }
  let firstPass = 0;
  let firstFail = 0;
  for (const v of firstByWo.values()) {
    const b = resultBucket(v.result);
    if (b === "PASS") firstPass += 1;
    else if (b === "FAIL") firstFail += 1;
  }
  const fpyDecided = firstPass + firstFail;
  const fpy = fpyDecided > 0 ? Math.round((firstPass / fpyDecided) * 100) : null;

  let pass = 0;
  let fail = 0;
  let pending = 0;
  for (const i of inspections) {
    const b = resultBucket(i.result);
    if (b === "PASS") pass += 1;
    else if (b === "FAIL") fail += 1;
    else pending += 1;
  }
  const decided = pass + fail;
  const passRate = decided > 0 ? Math.round((pass / decided) * 100) : null;

  const open = inspections.filter((i) => !DONE_INSPECTION.has((i.status ?? "").toUpperCase()));
  const overdue = open.filter((i) => i.dueDate && i.dueDate.getTime() < now.getTime()).length;

  // Resolve part numbers for the open table (loose FK).
  const partIds = open.map((i) => i.partId).filter((id): id is string => Boolean(id));
  const parts = partIds.length
    ? await prisma.part.findMany({
        where: { organizationId: ctx.organizationId, id: { in: partIds } },
        select: { id: true, partNumber: true }
      })
    : [];
  const partNumber = new Map(parts.map((p) => [p.id, p.partNumber]));

  const ncrGroups = await prisma.nonconformanceRecord.groupBy({
    by: ["severity"],
    where: { ...where, status: { notIn: ["CLOSED", "RESOLVED", "CANCELLED"] } },
    _count: { _all: true }
  });
  const openNcrs = ncrGroups.reduce((n, g) => n + g._count._all, 0);

  const donutSegments: DonutSegment[] = [
    { label: `Pass (${pass})`, value: pass, tone: "green" as Tone },
    { label: `Fail (${fail})`, value: fail, tone: "red" as Tone },
    { label: `Pending (${pending})`, value: pending, tone: "amber" as Tone }
  ].filter((s) => s.value > 0);

  // Live first-piece run-tracker board (FirstPieceRun) — when runs have been
  // logged, fold a real FPY (run #1 pass rate) and a defect-code Pareto in.
  const runs = await prisma.firstPieceRun.findMany({
    where,
    select: { result: true, runNumber: true, defectCode: true },
    take: 5000
  });
  let runFirstPass = 0;
  let runFirstDecided = 0;
  const defectCounts = new Map<string, number>();
  for (const r of runs) {
    const b = resultBucket(r.result);
    if ((r.runNumber ?? 1) === 1 && b !== "PENDING") {
      runFirstDecided += 1;
      if (b === "PASS") runFirstPass += 1;
    }
    if (b === "FAIL" && r.defectCode) {
      defectCounts.set(r.defectCode, (defectCounts.get(r.defectCode) ?? 0) + 1);
    }
  }
  const runFpy = runFirstDecided > 0 ? Math.round((runFirstPass / runFirstDecided) * 100) : null;
  const runKpis = runs.length
    ? [
        {
          label: "FPY (run tracker)",
          value: runFpy === null ? "—" : `${runFpy}%`,
          note: `${runFirstPass}/${runFirstDecided} run #1 · ${runs.length} runs logged`,
          tone: (runFpy !== null && runFpy >= 95 ? "green" : runFpy !== null && runFpy >= 85 ? "amber" : "red") as Tone
        }
      ]
    : [];
  const defectItems = [...defectCounts.entries()]
    .map(([label, value]) => ({ label, value, tone: "red" as Tone }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
  const runWidgets = defectItems.length
    ? [{ kind: "bar" as const, id: "defect-pareto", title: "Top fail defect codes (run tracker)", items: defectItems }]
    : [];

  return {
    note: `${scopedToFirstArticle ? "Scoped to first-article / FAI inspections (AS9102 first-piece context). " : "No first-article inspection types found — showing all quality inspections. "}First Pass Yield uses the earliest inspection per work order as the first-run proxy (QualityInspection has no per-run number).`,
    kpis: [
      {
        label: "First Pass Yield",
        value: fpy === null ? "—" : `${fpy}%`,
        note: fpyDecided > 0 ? `${firstPass}/${fpyDecided} passed first run` : "No first runs decided",
        tone: fpy !== null && fpy >= 95 ? "green" : fpy !== null && fpy >= 85 ? "amber" : "red"
      },
      { label: "Pass rate (all runs)", value: passRate === null ? "—" : `${passRate}%`, note: `${pass} pass · ${fail} fail`, tone: passRate !== null && passRate >= 90 ? "green" : "amber" },
      { label: "Overdue inspections", value: overdue, note: "Past due, not done", tone: overdue > 0 ? "red" : "green" },
      { label: "Open NCRs", value: openNcrs, note: "Nonconformances", tone: openNcrs > 0 ? "red" : "green" },
      ...runKpis
    ],
    widgets: [
      {
        kind: "donut",
        id: "result-mix",
        title: "Inspection result mix (all runs)",
        centerLabel: `${inspections.length}`,
        segments: donutSegments
      },
      {
        kind: "bar",
        id: "first-pass-outcome",
        title: "First-run outcome by work order",
        items: [
          { label: "Passed first run", value: firstPass, tone: "green" as Tone },
          { label: "Failed first run", value: firstFail, tone: "red" as Tone }
        ].filter((i) => i.value > 0)
      },
      {
        kind: "table",
        id: "open-inspections",
        title: "Open inspections",
        columns: [
          { key: "number", label: "Inspection" },
          { key: "part", label: "Part" },
          { key: "type", label: "Type" },
          { key: "due", label: "Due" },
          { key: "status", label: "Status" },
          { key: "result", label: "Result" }
        ],
        rows: open.slice(0, 100).map((i) => ({
          number: i.inspectionNumber,
          part: i.partId ? partNumber.get(i.partId) ?? "—" : "—",
          type: i.inspectionType,
          due: fmtDate(i.dueDate),
          status: i.status,
          result: i.result ?? "—"
        })),
        emptyLabel: "No open inspections."
      },
      {
        kind: "bar",
        id: "ncr-by-severity",
        title: "Open NCRs by severity",
        items: ncrGroups
          .map((g) => ({ label: g.severity, value: g._count._all, tone: severityTone(g.severity) }))
          .sort((a, b) => b.value - a.value)
      },
      ...runWidgets
    ]
  };
}
