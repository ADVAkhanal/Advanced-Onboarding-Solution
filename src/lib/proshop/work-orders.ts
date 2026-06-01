import { proshopGraphQL } from "./client";

/**
 * The ONE confirmed-working query (proven on the live instance per the
 * IT-Dashboard integration: query { status: { exactly: "Active" } } →
 * ~1042 records), plus a minimal-field fallback. Fields are minimized to
 * what the backlog view needs.
 */
export const ACTIVE_WORK_ORDERS_QUERY = `query ShopMgmtActiveWorkOrders($pageSize: Int = 100, $pageStart: Int = 0) {
  workOrders(pageSize: $pageSize, pageStart: $pageStart, query: { status: { exactly: "Active" } }) {
    totalRecords
    records {
      workOrderNumber
      status
      dueDate
      mustLeaveBy
      customerPlainText
      partPlainText
      estWODollarAmount
    }
  }
}`;

export const ACTIVE_WORK_ORDERS_QUERY_MINIMAL = `query ShopMgmtActiveWorkOrdersMinimal($pageSize: Int = 100, $pageStart: Int = 0) {
  workOrders(pageSize: $pageSize, pageStart: $pageStart, query: { status: { exactly: "Active" } }) {
    totalRecords
    records { workOrderNumber status }
  }
}`;

export interface ProShopWorkOrder {
  workOrderNumber?: string;
  status?: string;
  dueDate?: string | number | null;
  mustLeaveBy?: string | number | null;
  customerPlainText?: string;
  partPlainText?: string;
  estWODollarAmount?: number;
}

interface WorkOrdersPayload {
  workOrders?: { totalRecords?: number; records?: ProShopWorkOrder[] };
}

/**
 * Parse ProShop date values: epoch seconds, epoch millis, or ISO string.
 * Returns null for empty/invalid. Pure — unit-tested.
 */
export function parseProShopDate(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Effective "leave by" date for a work order. */
export function workOrderDue(wo: ProShopWorkOrder): Date | null {
  return parseProShopDate(wo.mustLeaveBy) ?? parseProShopDate(wo.dueDate);
}

export type ActiveWorkOrdersResult = {
  records: ProShopWorkOrder[];
  totalRecords: number;
  error: string | null;
};

const PAGE_SIZE = 100;
const MAX_PAGES = 15;

// 30s module-level cache so a dashboard render + its CSV/PDF export reuse
// one live pull rather than hammering ProShop.
let cache: { at: number; data: ActiveWorkOrdersResult } | null = null;
const CACHE_MS = 30_000;

export async function fetchActiveWorkOrders(): Promise<ActiveWorkOrdersResult> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const records: ProShopWorkOrder[] = [];
  let totalRecords = 0;
  let usedFallback = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const variables = { pageSize: PAGE_SIZE, pageStart: page * PAGE_SIZE };
    let res = await proshopGraphQL<WorkOrdersPayload>(ACTIVE_WORK_ORDERS_QUERY, variables);

    // On a field-level schema error, retry once with the minimal field set.
    if (res.error && !usedFallback && page === 0) {
      usedFallback = true;
      res = await proshopGraphQL<WorkOrdersPayload>(ACTIVE_WORK_ORDERS_QUERY_MINIMAL, variables);
    }
    if (res.error) {
      const result = { records, totalRecords, error: res.error };
      return result;
    }

    const node = res.data?.workOrders;
    const pageRecords = node?.records ?? [];
    totalRecords = node?.totalRecords ?? records.length + pageRecords.length;
    records.push(...pageRecords);
    if (pageRecords.length === 0 || records.length >= totalRecords) break;
  }

  const result: ActiveWorkOrdersResult = { records, totalRecords, error: null };
  cache = { at: Date.now(), data: result };
  return result;
}
