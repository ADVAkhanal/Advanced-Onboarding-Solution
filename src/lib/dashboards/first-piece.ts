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

  let inspections = await prisma.qualityInspection.findMany({
    where: firstArticleWhere,
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: 200,
    select: { id: true, inspectionNumber: true, partId: true, workOrderId: true, inspectionType: true, result: true, status: true, dueDate: true }
  });
  let scopedToFirstArticle = true;
  if (inspections.length === 0) {
    scopedToFirstArticle = false;
    inspections = await prisma.qualityInspection.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 200,
      select: { id: true, inspectionNumber: true, partId: true, workOrderId: true, inspectionType: true, result: true, status: true, dueDate: true }
    });
  }

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

  return {
    note: scopedToFirstArticle
      ? "Scoped to first-article / FAI inspections (AS9102 first-piece context)."
      : "No first-article inspection types found — showing all quality inspections.",
    kpis: [
      { label: "Open inspections", value: open.length, note: scopedToFirstArticle ? "First-article" : "All types", tone: "blue" },
      { label: "Pass rate", value: passRate === null ? "—" : `${passRate}%`, note: `${pass} pass · ${fail} fail`, tone: passRate !== null && passRate >= 90 ? "green" : "amber" },
      { label: "Overdue inspections", value: overdue, note: "Past due, not done", tone: overdue > 0 ? "red" : "green" },
      { label: "Open NCRs", value: openNcrs, note: "Nonconformances", tone: openNcrs > 0 ? "red" : "green" }
    ],
    widgets: [
      {
        kind: "donut",
        id: "result-mix",
        title: "Inspection result mix",
        centerLabel: `${inspections.length}`,
        segments: donutSegments
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
      }
    ]
  };
}
