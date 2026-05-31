import { prisma } from "@/lib/prisma";
import { materialLabel } from "@/lib/quoting";
import type { DashboardContext, DashboardData, Tone } from "./types";

const NEW_WINDOW_DAYS = 90;
const ACTIVE_WO = ["PLANNED", "RELEASED", "IN_PROGRESS", "RUNNING", "ON_HOLD"];

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

/**
 * npi-dashboard — New Product Introduction funnel.
 * Reimagines ADVAkhanal/npi-dashboard: parts created in the last 90 days
 * and their progression New → Quoted → In Production, over Part /
 * QuoteLine / WorkOrder.
 */
export async function loadNpi(ctx: DashboardContext): Promise<DashboardData> {
  const now = new Date();
  const since = new Date(now.getTime() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const newParts = await prisma.part.findMany({
    where: { organizationId: ctx.organizationId, archivedAt: null, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, partNumber: true, description: true, materialCategory: true, createdAt: true }
  });

  const partIds = newParts.map((p) => p.id);

  const [quotedLines, workOrders] = await Promise.all([
    partIds.length
      ? prisma.quoteLine.findMany({
          where: { organizationId: ctx.organizationId, partId: { in: partIds }, archivedAt: null },
          select: { partId: true }
        })
      : Promise.resolve([]),
    partIds.length
      ? prisma.workOrder.findMany({
          where: { organizationId: ctx.organizationId, partId: { in: partIds }, archivedAt: null },
          select: { partId: true, status: true }
        })
      : Promise.resolve([])
  ]);

  const quotedSet = new Set(quotedLines.map((l) => l.partId).filter(Boolean) as string[]);
  const inProdSet = new Set(
    workOrders
      .filter((w) => ACTIVE_WO.includes((w.status ?? "").toUpperCase()))
      .map((w) => w.partId)
      .filter(Boolean) as string[]
  );
  const anyWoSet = new Set(workOrders.map((w) => w.partId).filter(Boolean) as string[]);

  const total = newParts.length;
  const quotedCount = newParts.filter((p) => quotedSet.has(p.id)).length;
  const inProdCount = newParts.filter((p) => inProdSet.has(p.id)).length;
  const conversion = total > 0 ? Math.round((inProdCount / total) * 100) : null;

  // New parts by material category.
  const byMaterial = new Map<string, number>();
  for (const p of newParts) {
    const key = p.materialCategory ? materialLabel(p.materialCategory) : "Unspecified";
    byMaterial.set(key, (byMaterial.get(key) ?? 0) + 1);
  }

  return {
    note: `New parts = created in the last ${NEW_WINDOW_DAYS} days. Quoted = appears on a quote line; In production = has an active work order.`,
    kpis: [
      { label: "New parts (90d)", value: total, note: "Introduced", tone: "blue" },
      { label: "Quoted", value: quotedCount, note: total ? `${Math.round((quotedCount / total) * 100)}% of new` : "—", tone: "cyan" },
      { label: "In production", value: inProdCount, note: "Active work order", tone: "green" },
      { label: "NPI conversion", value: conversion === null ? "—" : `${conversion}%`, note: "New → production", tone: conversion !== null && conversion >= 30 ? "green" : "amber" }
    ],
    widgets: [
      {
        kind: "bar",
        id: "funnel",
        title: "NPI funnel",
        items: [
          { label: "New parts", value: total, max: Math.max(1, total), tone: "blue" as Tone },
          { label: "Quoted", value: quotedCount, max: Math.max(1, total), tone: "cyan" as Tone },
          { label: "Any work order", value: anyWoSet.size, max: Math.max(1, total), tone: "amber" as Tone },
          { label: "In production", value: inProdCount, max: Math.max(1, total), tone: "green" as Tone }
        ]
      },
      {
        kind: "bar",
        id: "by-material",
        title: "New parts by material",
        items: [...byMaterial.entries()]
          .map(([label, value]) => ({ label, value, tone: "blue" as Tone }))
          .sort((a, b) => b.value - a.value)
      },
      {
        kind: "table",
        id: "new-parts",
        title: "New parts",
        columns: [
          { key: "part", label: "Part" },
          { key: "description", label: "Description" },
          { key: "material", label: "Material" },
          { key: "created", label: "Created" },
          { key: "stage", label: "Stage" }
        ],
        rows: newParts.map((p) => ({
          part: p.partNumber,
          description: p.description,
          material: p.materialCategory ? materialLabel(p.materialCategory) : "—",
          created: fmtDate(p.createdAt),
          stage: inProdSet.has(p.id)
            ? "In production"
            : quotedSet.has(p.id)
              ? "Quoted"
              : "New"
        })),
        emptyLabel: "No new parts in the last 90 days."
      }
    ]
  };
}
