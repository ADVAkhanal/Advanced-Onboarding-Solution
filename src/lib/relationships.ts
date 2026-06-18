import type { AuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Relationship resolver — connects a record to the things around it using
 * ordinary, indexed Prisma queries. No graph database; no AI. Targeted joins
 * over the existing org-scoped indexes keep it cheap.
 *
 * Add a new anchor entity by adding a case here; the RelationshipPanel renders
 * whatever groups are returned.
 */

export type RelationItem = { id: string; label: string; sublabel?: string; href: string };
export type RelationGroup = { key: string; label: string; items: RelationItem[] };

export async function loadRelationships(
  user: AuthenticatedUser,
  entityType: string,
  entityId: string
): Promise<RelationGroup[]> {
  switch (entityType) {
    case "quote":
      return quoteRelations(user, entityId);
    default:
      return [];
  }
}

async function quoteRelations(user: AuthenticatedUser, quoteId: string): Promise<RelationGroup[]> {
  const org = user.organizationId;
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: org, archivedAt: null },
    select: { id: true, customerId: true }
  });
  if (!quote || !quote.customerId) return [];

  const customerId = quote.customerId;
  const [customer, orders, jobs, shipments] = await Promise.all([
    prisma.customerAccount.findFirst({ where: { id: customerId, organizationId: org }, select: { id: true, name: true, status: true } }),
    prisma.salesOrder.findMany({ where: { organizationId: org, customerId, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, orderNumber: true, status: true } }),
    prisma.workOrder.findMany({ where: { organizationId: org, customerId, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, workOrderNumber: true, title: true, status: true } }),
    prisma.shipment.findMany({ where: { organizationId: org, customerId, archivedAt: null }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, shipmentNumber: true, status: true } })
  ]);

  const groups: RelationGroup[] = [];
  if (customer) {
    groups.push({ key: "customer", label: "Customer", items: [{ id: customer.id, label: customer.name, sublabel: customer.status ?? undefined, href: "/erp/customers" }] });
  }
  groups.push({ key: "orders", label: "Sales orders (same customer)", items: orders.map((o) => ({ id: o.id, label: o.orderNumber, sublabel: o.status, href: "/erp/quotes" })) });
  groups.push({ key: "jobs", label: "Work orders (same customer)", items: jobs.map((j) => ({ id: j.id, label: j.workOrderNumber, sublabel: j.title, href: "/erp/jobs" })) });
  groups.push({ key: "shipments", label: "Shipments (same customer)", items: shipments.map((s) => ({ id: s.id, label: s.shipmentNumber, sublabel: s.status, href: "/erp/shipping" })) });
  return groups;
}
