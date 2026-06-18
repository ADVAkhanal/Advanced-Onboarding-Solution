import type { AuthenticatedUser } from "@/lib/auth";
import { getMemo } from "@/lib/cache/snapshots";
import { checkEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * Action Center — "what needs attention right now", rule-based, NO AI.
 *
 * Every alert is derived from live local Postgres data via deterministic rules
 * (no model decides whether something is an alert). Results are memoised per
 * org for a short TTL so a wall-mounted dashboard refreshing every few seconds
 * does not hammer the database. Each alert carries severity, source module, a
 * deep-link to the record, when it became relevant, and a suggested next action.
 */

export type AlertSeverity = "critical" | "warning" | "info";

export type ActionAlert = {
  id: string;
  severity: AlertSeverity;
  module: string;
  title: string;
  detail?: string;
  href: string;
  createdAt: string;
  suggestedAction: string;
};

const DUE_SOON_DAYS = 3;
const PER_CATEGORY = 8;
const TTL_MS = 45_000;

// Terminal/closed status sets per module (status casing differs by module).
const JOB_DONE = ["COMPLETE", "COMPLETED", "CLOSED", "CANCELLED", "SHIPPED", "DONE"];
const PO_DONE = ["RECEIVED", "CLOSED", "CANCELLED", "COMPLETE", "COMPLETED"];
const SHIP_DONE = ["SHIPPED", "DELIVERED", "CANCELLED"];
const NCR_DONE = ["CLOSED", "RESOLVED", "CANCELLED"];
const QI_DONE = ["COMPLETE", "COMPLETED", "CLOSED", "PASS", "PASSED"];
const TICKET_DONE = ["Closed", "Resolved", "Cancelled", "Done", "CLOSED", "RESOLVED"];

// ---- pure rule helpers (unit-tested without a database) ----
export function isOverdue(due: Date | null, now: Date): boolean {
  return !!due && due.getTime() < now.getTime();
}
export function isLowStock(onHand: number, reorderPoint: number | null): boolean {
  return reorderPoint != null && onHand <= reorderPoint;
}
export function severityRank(s: AlertSeverity): number {
  return s === "critical" ? 0 : s === "warning" ? 1 : 2;
}
export function summarizeAlerts(alerts: ActionAlert[]) {
  return {
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length
  };
}

async function compute(org: string): Promise<ActionAlert[]> {
  const now = new Date();
  const soon = new Date(now.getTime() + DUE_SOON_DAYS * 86_400_000);
  const out: ActionAlert[] = [];

  const [overdueJobs, dueSoonJobs, latePos, shipments, invItems, ncrs, inspections, tickets, approvals] =
    await Promise.all([
      prisma.workOrder.findMany({
        where: { organizationId: org, archivedAt: null, status: { notIn: JOB_DONE }, dueDate: { lt: now } },
        orderBy: { dueDate: "asc" }, take: PER_CATEGORY,
        select: { id: true, workOrderNumber: true, title: true, dueDate: true }
      }),
      prisma.workOrder.findMany({
        where: { organizationId: org, archivedAt: null, status: { notIn: JOB_DONE }, dueDate: { gte: now, lte: soon } },
        orderBy: { dueDate: "asc" }, take: PER_CATEGORY,
        select: { id: true, workOrderNumber: true, title: true, dueDate: true }
      }),
      prisma.purchaseOrder.findMany({
        where: { organizationId: org, archivedAt: null, status: { notIn: PO_DONE }, expectedDate: { lt: now } },
        orderBy: { expectedDate: "asc" }, take: PER_CATEGORY,
        select: { id: true, poNumber: true, expectedDate: true }
      }),
      prisma.shipment.findMany({
        where: { organizationId: org, archivedAt: null, status: { notIn: SHIP_DONE }, shipDate: { lte: soon } },
        orderBy: { shipDate: "asc" }, take: PER_CATEGORY,
        select: { id: true, shipmentNumber: true, shipDate: true }
      }),
      prisma.inventoryItem.findMany({
        where: { organizationId: org, archivedAt: null, status: "ACTIVE", reorderPoint: { not: null } },
        take: 1000,
        select: { id: true, itemNumber: true, quantityOnHand: true, reorderPoint: true }
      }),
      prisma.nonconformanceRecord.findMany({
        where: { organizationId: org, archivedAt: null, status: { notIn: NCR_DONE } },
        orderBy: { createdAt: "asc" }, take: PER_CATEGORY,
        select: { id: true, ncrNumber: true, title: true, severity: true, createdAt: true }
      }),
      prisma.qualityInspection.findMany({
        where: { organizationId: org, archivedAt: null, status: { notIn: QI_DONE }, dueDate: { lt: now } },
        orderBy: { dueDate: "asc" }, take: PER_CATEGORY,
        select: { id: true, inspectionNumber: true, dueDate: true }
      }),
      prisma.ticket.findMany({
        where: { organizationId: org, archivedAt: null, status: { notIn: TICKET_DONE }, assignedOwnerId: null },
        orderBy: { createdAt: "asc" }, take: PER_CATEGORY,
        select: { id: true, ticketNumber: true, title: true, createdAt: true }
      }),
      prisma.approvalRequest.findMany({
        where: { organizationId: org, archivedAt: null, status: "Pending" },
        orderBy: { createdAt: "asc" }, take: PER_CATEGORY,
        select: { id: true, requestNumber: true, summary: true, createdAt: true }
      })
    ]);

  for (const j of overdueJobs)
    out.push({ id: `job:${j.id}`, severity: "critical", module: "Jobs", title: `Overdue job ${j.workOrderNumber}`, detail: j.title, href: "/erp/jobs", createdAt: (j.dueDate ?? now).toISOString(), suggestedAction: "Reschedule or expedite; confirm the promise date with the customer." });
  for (const j of dueSoonJobs)
    out.push({ id: `job-soon:${j.id}`, severity: "warning", module: "Jobs", title: `Job ${j.workOrderNumber} due soon`, detail: j.title, href: "/erp/jobs", createdAt: (j.dueDate ?? now).toISOString(), suggestedAction: "Verify routing progress and material readiness." });
  for (const p of latePos)
    out.push({ id: `po:${p.id}`, severity: "warning", module: "Purchasing", title: `Late PO ${p.poNumber}`, href: "/erp/purchasing", createdAt: (p.expectedDate ?? now).toISOString(), suggestedAction: "Follow up with the vendor on delivery." });
  for (const s of shipments) {
    const overdue = isOverdue(s.shipDate, now);
    out.push({ id: `ship:${s.id}`, severity: overdue ? "critical" : "warning", module: "Shipping", title: `${overdue ? "Overdue" : "Upcoming"} shipment ${s.shipmentNumber}`, href: "/erp/shipping", createdAt: (s.shipDate ?? now).toISOString(), suggestedAction: overdue ? "Ship now or update the promise date." : "Confirm packing and carrier pickup." });
  }
  const low = invItems
    .filter((i) => isLowStock(Number(i.quantityOnHand), i.reorderPoint == null ? null : Number(i.reorderPoint)))
    .slice(0, PER_CATEGORY);
  for (const i of low)
    out.push({ id: `inv:${i.id}`, severity: "warning", module: "Inventory", title: `Low stock: ${i.itemNumber}`, detail: `${Number(i.quantityOnHand)} on hand (reorder at ${Number(i.reorderPoint)})`, href: "/erp/inventory", createdAt: now.toISOString(), suggestedAction: "Raise a purchase order to replenish." });
  for (const n of ncrs)
    out.push({ id: `ncr:${n.id}`, severity: n.severity === "HIGH" || n.severity === "CRITICAL" ? "critical" : "warning", module: "Quality", title: `Open NCR ${n.ncrNumber}`, detail: n.title, href: "/erp/quality", createdAt: n.createdAt.toISOString(), suggestedAction: "Disposition and close the nonconformance." });
  for (const q of inspections)
    out.push({ id: `qi:${q.id}`, severity: "warning", module: "Quality", title: `Overdue inspection ${q.inspectionNumber}`, href: "/erp/quality", createdAt: (q.dueDate ?? now).toISOString(), suggestedAction: "Complete the inspection to release the job." });
  for (const t of tickets)
    out.push({ id: `ticket:${t.id}`, severity: "warning", module: "Tickets", title: `Unassigned ticket ${t.ticketNumber}`, detail: t.title, href: `/tickets/${t.id}`, createdAt: t.createdAt.toISOString(), suggestedAction: "Assign an owner and acknowledge the requester." });
  for (const a of approvals)
    out.push({ id: `appr:${a.id}`, severity: "info", module: "Approvals", title: `Pending approval ${a.requestNumber}`, detail: a.summary, href: "/approvals", createdAt: a.createdAt.toISOString(), suggestedAction: "Review and decide." });

  const env = checkEnv();
  if (!env.ok)
    out.push({ id: "readiness:env", severity: "info", module: "System", title: `${env.missing.length} required setting(s) missing`, detail: env.missing.join(", "), href: "/admin/settings", createdAt: now.toISOString(), suggestedAction: "Set the missing environment variables on Railway." });

  out.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.createdAt.localeCompare(b.createdAt));
  return out;
}

export async function loadActionCenter(user: AuthenticatedUser): Promise<ActionAlert[]> {
  return getMemo(`action-center:${user.organizationId}`, () => compute(user.organizationId), TTL_MS);
}
