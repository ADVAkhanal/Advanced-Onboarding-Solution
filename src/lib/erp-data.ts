import type { AuthenticatedUser } from "./auth";
import { departmentScopeForUser } from "./auth";
import { prisma } from "./prisma";

const openWorkOrderStatuses = ["PLANNED", "RELEASED", "IN_PROCESS", "BLOCKED", "HOLD"];
const openQuoteStatuses = ["DRAFT", "IN_REVIEW", "SENT", "REVISION_REQUESTED"];
const openPoStatuses = ["DRAFT", "ORDERED", "PARTIAL", "LATE"];

export function erpDepartmentScope(user: AuthenticatedUser) {
  if (user.userLevel === "USER") {
    return { ownerId: user.id };
  }
  return departmentScopeForUser(user);
}

export async function getErpReferenceData(user: AuthenticatedUser) {
  const departmentWhere =
    user.userLevel === "MANAGER"
      ? { id: user.departmentId ?? "__none__" }
      : user.userLevel === "DIRECTOR" && !user.allDepartmentAccess
        ? { id: { in: user.departmentAccessIds.length ? user.departmentAccessIds : [user.departmentId ?? "__none__"] } }
        : {};

  const [departments, customers, vendors, parts, salesOrders, workOrders, operations, inventoryItems, users] = await Promise.all([
    prisma.department.findMany({ where: { organizationId: user.organizationId, archivedAt: null, ...departmentWhere }, orderBy: { name: "asc" }, take: 200 }),
    prisma.customerAccount.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { name: "asc" }, take: 200 }),
    prisma.vendorAccount.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { name: "asc" }, take: 200 }),
    prisma.part.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { partNumber: "asc" }, take: 300 }),
    prisma.salesOrder.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { orderNumber: "desc" }, take: 200 }),
    prisma.workOrder.findMany({ where: { organizationId: user.organizationId, archivedAt: null, ...erpDepartmentScope(user) }, orderBy: { workOrderNumber: "desc" }, take: 300 }),
    prisma.workOrderOperation.findMany({ where: { organizationId: user.organizationId, archivedAt: null, ...erpDepartmentScope(user) }, orderBy: { operationNumber: "asc" }, take: 300 }),
    prisma.inventoryItem.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { itemNumber: "asc" }, take: 300 }),
    prisma.user.findMany({ where: { organizationId: user.organizationId, archivedAt: null, status: "ACTIVE" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 300 })
  ]);

  return { departments, customers, vendors, parts, salesOrders, workOrders, operations, inventoryItems, users };
}

export async function getErpDashboardData(user: AuthenticatedUser) {
  const now = new Date();
  const departmentScope = erpDepartmentScope(user);

  const [
    customers,
    openQuotes,
    activeSalesOrders,
    activeWorkOrders,
    lateWorkOrders,
    scheduledToday,
    inventoryItems,
    lowStockItems,
    openPurchaseOrders,
    latePurchaseOrders,
    plannedShipments,
    pendingInspections,
    openNcrs,
    recentTimeEntries
  ] = await Promise.all([
    prisma.customerAccount.count({ where: { organizationId: user.organizationId, archivedAt: null, status: "ACTIVE" } }),
    prisma.quote.count({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: openQuoteStatuses } } }),
    prisma.salesOrder.count({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: ["OPEN", "RELEASED", "PARTIAL"] } } }),
    prisma.workOrder.count({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: openWorkOrderStatuses }, ...departmentScope } }),
    prisma.workOrder.count({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: openWorkOrderStatuses }, dueDate: { lt: now }, ...departmentScope } }),
    prisma.shopScheduleItem.count({ where: { organizationId: user.organizationId, archivedAt: null, scheduleDate: { gte: new Date(now.toDateString()) }, ...departmentScope } }),
    prisma.inventoryItem.count({ where: { organizationId: user.organizationId, archivedAt: null } }),
    prisma.inventoryItem.count({ where: { organizationId: user.organizationId, archivedAt: null, status: "LOW_STOCK" } }),
    prisma.purchaseOrder.count({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: openPoStatuses } } }),
    prisma.purchaseOrder.count({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: openPoStatuses }, expectedDate: { lt: now } } }),
    prisma.shipment.count({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: ["PLANNED", "READY", "HOLD"] } } }),
    prisma.qualityInspection.count({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: ["PENDING", "IN_PROGRESS", "HOLD"] }, ...departmentScope } }),
    prisma.nonconformanceRecord.count({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: ["OPEN", "REVIEW", "DISPOSITION"] }, ...departmentScope } }),
    prisma.timeEntry.count({ where: { organizationId: user.organizationId, archivedAt: null, entryDate: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, ...(user.userLevel === "USER" ? { userId: user.id } : departmentScope) } })
  ]);

  const [hotJobs, latePurchasing, qualityQueue, shipments] = await Promise.all([
    prisma.workOrder.findMany({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: openWorkOrderStatuses }, ...departmentScope }, orderBy: [{ priority: "desc" }, { dueDate: "asc" }], take: 8 }),
    prisma.purchaseOrder.findMany({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: openPoStatuses } }, orderBy: [{ expectedDate: "asc" }, { updatedAt: "desc" }], take: 8 }),
    prisma.qualityInspection.findMany({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: ["PENDING", "IN_PROGRESS", "HOLD"] }, ...departmentScope }, orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }], take: 8 }),
    prisma.shipment.findMany({ where: { organizationId: user.organizationId, archivedAt: null, status: { in: ["PLANNED", "READY", "HOLD"] } }, orderBy: [{ shipDate: "asc" }, { updatedAt: "desc" }], take: 8 })
  ]);

  return {
    metrics: {
      customers,
      openQuotes,
      activeSalesOrders,
      activeWorkOrders,
      lateWorkOrders,
      scheduledToday,
      inventoryItems,
      lowStockItems,
      openPurchaseOrders,
      latePurchaseOrders,
      plannedShipments,
      pendingInspections,
      openNcrs,
      recentTimeEntries
    },
    hotJobs,
    latePurchasing,
    qualityQueue,
    shipments
  };
}

export function formatShortDate(date: Date | null) {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function decimalText(value: unknown) {
  if (value === null || value === undefined) return "0";
  return String(value);
}
