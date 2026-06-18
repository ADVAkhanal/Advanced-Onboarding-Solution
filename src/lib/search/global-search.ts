import type { AuthenticatedUser } from "@/lib/auth";
import { departmentScopeForUser } from "@/lib/auth";
import type { PermissionKey } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Global command search — PostgreSQL + Prisma, NO AI.
 *
 * Permission-aware: a module is only queried if the caller holds its view
 * permission, so results never leak records the user could not otherwise open.
 * Department-scoped modules (jobs, tickets) additionally apply the user's
 * department scope. Uses case-insensitive `contains` (ILIKE) over the indexed
 * business identifiers/names — fast enough for a single-shop dataset; the
 * pg_trgm upgrade path is documented in docs/search.md for larger volumes.
 */

export type SearchResult = {
  module: string;
  moduleLabel: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type SearchGroup = {
  module: string;
  moduleLabel: string;
  results: SearchResult[];
};

export type SearchResponse = {
  query: string;
  groups: SearchGroup[];
  total: number;
};

const PER_MODULE = 6;
const MIN_QUERY = 2;

type ModuleDef = {
  key: string;
  label: string;
  permission: PermissionKey;
  deptScoped?: boolean;
};

// The catalog of searchable modules and the permission each requires. Exported
// (via moduleKeysFor) so the gating is unit-testable without a database.
const MODULES: ModuleDef[] = [
  { key: "quotes", label: "Quotes", permission: "quote:view" },
  { key: "salesOrders", label: "Sales Orders", permission: "erp:view" },
  { key: "jobs", label: "Jobs / Work Orders", permission: "erp:view", deptScoped: true },
  { key: "customers", label: "Customers", permission: "erp:view" },
  { key: "parts", label: "Parts", permission: "erp:view" },
  { key: "inventory", label: "Inventory", permission: "erp:view" },
  { key: "purchaseOrders", label: "Purchasing", permission: "erp:view" },
  { key: "receipts", label: "Receiving", permission: "erp:view" },
  { key: "shipments", label: "Shipping", permission: "erp:view" },
  { key: "quality", label: "Quality (Inspections)", permission: "erp:view" },
  { key: "ncrs", label: "Quality (NCRs)", permission: "erp:view" },
  { key: "tickets", label: "Tickets", permission: "ticket:view", deptScoped: true },
  { key: "approvals", label: "Approvals", permission: "approval:view" },
  { key: "crm", label: "CRM Requests", permission: "crm:view" },
  { key: "machines", label: "Machines", permission: "maintenance:view" },
  { key: "maintenanceWos", label: "Maintenance Work Orders", permission: "maintenance:view" },
  { key: "users", label: "Employees", permission: "admin:manage" }
];

/** Which module keys this user is allowed to search (permission-gated). */
export function moduleKeysFor(permissions: PermissionKey[]): string[] {
  const set = new Set(permissions);
  return MODULES.filter((m) => set.has(m.permission)).map((m) => m.key);
}

function ilike(fields: string[], q: string) {
  return { OR: fields.map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } })) };
}

export async function globalSearch(user: AuthenticatedUser, rawQuery: string): Promise<SearchResponse> {
  const query = rawQuery.trim();
  if (query.length < MIN_QUERY) {
    return { query, groups: [], total: 0 };
  }

  const allowed = new Set(moduleKeysFor(user.permissions));
  const org = { organizationId: user.organizationId, archivedAt: null };
  const deptScope = departmentScopeForUser(user);
  const take = PER_MODULE;

  const runners: Array<Promise<SearchGroup | null>> = [];

  const add = (key: string, run: () => Promise<SearchResult[]>) => {
    if (!allowed.has(key)) return;
    const def = MODULES.find((m) => m.key === key)!;
    runners.push(
      run()
        .then((results) => (results.length ? { module: key, moduleLabel: def.label, results } : null))
        .catch(() => null)
    );
  };

  add("quotes", async () =>
    (
      await prisma.quote.findMany({
        where: { ...org, ...ilike(["quoteNumber", "title", "notes"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, quoteNumber: true, title: true, status: true }
      })
    ).map((r) => ({
      module: "quotes",
      moduleLabel: "Quotes",
      id: r.id,
      title: r.quoteNumber,
      subtitle: `${r.title}${r.status ? ` · ${r.status}` : ""}`,
      href: `/erp/quotes/${r.id}`
    }))
  );

  add("salesOrders", async () =>
    (
      await prisma.salesOrder.findMany({
        where: { ...org, ...ilike(["orderNumber", "customerPoNumber", "notes"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, orderNumber: true, status: true }
      })
    ).map((r) => ({ module: "salesOrders", moduleLabel: "Sales Orders", id: r.id, title: r.orderNumber, subtitle: r.status, href: "/erp/quotes" }))
  );

  add("jobs", async () =>
    (
      await prisma.workOrder.findMany({
        where: { ...org, ...deptScope, ...ilike(["workOrderNumber", "title", "notes"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, workOrderNumber: true, title: true, status: true }
      })
    ).map((r) => ({ module: "jobs", moduleLabel: "Jobs / Work Orders", id: r.id, title: r.workOrderNumber, subtitle: `${r.title}${r.status ? ` · ${r.status}` : ""}`, href: "/erp/jobs" }))
  );

  add("customers", async () =>
    (
      await prisma.customerAccount.findMany({
        where: { ...org, ...ilike(["name", "primaryContactName", "primaryEmail"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, name: true, primaryContactName: true }
      })
    ).map((r) => ({ module: "customers", moduleLabel: "Customers", id: r.id, title: r.name, subtitle: r.primaryContactName ?? undefined, href: "/erp/customers" }))
  );

  add("parts", async () =>
    (
      await prisma.part.findMany({
        where: { ...org, ...ilike(["partNumber", "description"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, partNumber: true, description: true }
      })
    ).map((r) => ({ module: "parts", moduleLabel: "Parts", id: r.id, title: r.partNumber, subtitle: r.description ?? undefined, href: "/erp/customers" }))
  );

  add("inventory", async () =>
    (
      await prisma.inventoryItem.findMany({
        where: { ...org, ...ilike(["itemNumber", "description"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, itemNumber: true, description: true }
      })
    ).map((r) => ({ module: "inventory", moduleLabel: "Inventory", id: r.id, title: r.itemNumber, subtitle: r.description ?? undefined, href: "/erp/inventory" }))
  );

  add("purchaseOrders", async () =>
    (
      await prisma.purchaseOrder.findMany({
        where: { ...org, ...ilike(["poNumber", "notes"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, poNumber: true, status: true }
      })
    ).map((r) => ({ module: "purchaseOrders", moduleLabel: "Purchasing", id: r.id, title: r.poNumber, subtitle: r.status, href: "/erp/purchasing" }))
  );

  add("receipts", async () =>
    (
      await prisma.receipt.findMany({
        where: { ...org, ...ilike(["receiptNumber", "notes"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, receiptNumber: true, status: true }
      })
    ).map((r) => ({ module: "receipts", moduleLabel: "Receiving", id: r.id, title: r.receiptNumber, subtitle: r.status, href: "/erp/purchasing" }))
  );

  add("shipments", async () =>
    (
      await prisma.shipment.findMany({
        where: { ...org, ...ilike(["shipmentNumber", "carrierName", "trackingNumber"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, shipmentNumber: true, status: true, carrierName: true }
      })
    ).map((r) => ({ module: "shipments", moduleLabel: "Shipping", id: r.id, title: r.shipmentNumber, subtitle: `${r.status}${r.carrierName ? ` · ${r.carrierName}` : ""}`, href: "/erp/shipping" }))
  );

  add("quality", async () =>
    (
      await prisma.qualityInspection.findMany({
        where: { ...org, ...ilike(["inspectionNumber", "notes"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, inspectionNumber: true, status: true }
      })
    ).map((r) => ({ module: "quality", moduleLabel: "Quality (Inspections)", id: r.id, title: r.inspectionNumber, subtitle: r.status, href: "/erp/quality" }))
  );

  add("ncrs", async () =>
    (
      await prisma.nonconformanceRecord.findMany({
        where: { ...org, ...ilike(["ncrNumber", "title", "notes"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, ncrNumber: true, title: true, status: true }
      })
    ).map((r) => ({ module: "ncrs", moduleLabel: "Quality (NCRs)", id: r.id, title: r.ncrNumber, subtitle: `${r.title}${r.status ? ` · ${r.status}` : ""}`, href: "/erp/quality" }))
  );

  add("tickets", async () =>
    (
      await prisma.ticket.findMany({
        where: { ...org, ...deptScope, ...ilike(["ticketNumber", "title", "description"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, ticketNumber: true, title: true, status: true }
      })
    ).map((r) => ({ module: "tickets", moduleLabel: "Tickets", id: r.id, title: r.ticketNumber, subtitle: `${r.title}${r.status ? ` · ${r.status}` : ""}`, href: `/tickets/${r.id}` }))
  );

  add("approvals", async () =>
    (
      await prisma.approvalRequest.findMany({
        where: { ...org, ...ilike(["requestNumber", "summary"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, requestNumber: true, summary: true, status: true }
      })
    ).map((r) => ({ module: "approvals", moduleLabel: "Approvals", id: r.id, title: r.requestNumber, subtitle: `${r.summary ?? ""}${r.status ? ` · ${r.status}` : ""}`, href: "/approvals" }))
  );

  add("crm", async () =>
    (
      await prisma.crmRequest.findMany({
        where: { ...org, ...ilike(["contactName", "companyName", "title", "email"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, contactName: true, companyName: true, title: true }
      })
    ).map((r) => ({ module: "crm", moduleLabel: "CRM Requests", id: r.id, title: r.companyName || r.contactName, subtitle: r.title, href: "/crm" }))
  );

  add("machines", async () =>
    (
      await prisma.machine.findMany({
        where: { ...org, ...ilike(["code", "name", "manufacturer", "serial"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, code: true, name: true, status: true }
      })
    ).map((r) => ({ module: "machines", moduleLabel: "Machines", id: r.id, title: `${r.code} · ${r.name}`, subtitle: r.status, href: "/maintenance/machines" }))
  );

  add("maintenanceWos", async () =>
    (
      await prisma.maintenanceWorkOrder.findMany({
        where: { ...org, ...ilike(["woNumber", "title", "description"], query) },
        orderBy: { updatedAt: "desc" },
        take,
        select: { id: true, woNumber: true, title: true, status: true }
      })
    ).map((r) => ({ module: "maintenanceWos", moduleLabel: "Maintenance Work Orders", id: r.id, title: r.woNumber, subtitle: `${r.title}${r.status ? ` · ${r.status}` : ""}`, href: "/maintenance/work-orders" }))
  );

  add("users", async () =>
    (
      await prisma.user.findMany({
        where: { organizationId: user.organizationId, archivedAt: null, ...ilike(["firstName", "lastName", "email", "title"], query) },
        orderBy: { lastName: "asc" },
        take,
        select: { id: true, firstName: true, lastName: true, email: true, title: true }
      })
    ).map((r) => ({ module: "users", moduleLabel: "Employees", id: r.id, title: `${r.firstName} ${r.lastName}`, subtitle: r.title ?? r.email, href: "/admin/users" }))
  );

  const settled = await Promise.all(runners);
  const groups = settled.filter((g): g is SearchGroup => g !== null);
  const total = groups.reduce((s, g) => s + g.results.length, 0);
  return { query, groups, total };
}
