import { prisma } from "@/lib/prisma";
import { isProShopConfigured } from "@/lib/proshop/client";
import { fetchActiveWorkOrders, workOrderDue } from "@/lib/proshop/work-orders";
import type { DashboardContext, DashboardData, Tone } from "./types";

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(d) : "—";
}
function fmtWhen(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(d) : "never";
}

// Common shape both the local mirror and a live fetch map into.
type BacklogRow = { number: string; customer: string; part: string; status: string; due: Date | null; value: number };

function build(rows: BacklogRow[], note: string): DashboardData {
  const now = Date.now();
  const in7 = now + 7 * 24 * 60 * 60 * 1000;
  let backlogValue = 0;
  let overdue = 0;
  let dueSoon = 0;
  for (const r of rows) {
    backlogValue += r.value;
    if (r.due) {
      if (r.due.getTime() < now) overdue += 1;
      else if (r.due.getTime() <= in7) dueSoon += 1;
    }
  }

  const byCustomer = new Map<string, number>();
  for (const r of rows) byCustomer.set(r.customer, (byCustomer.get(r.customer) ?? 0) + r.value);
  const topCustomers = [...byCustomer.entries()]
    .map(([label, value]) => ({ label, value: Math.round(value), tone: "blue" as Tone }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const sorted = [...rows].sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity));

  return {
    note,
    kpis: [
      { label: "Active work orders", value: rows.length, note: "Status = Active", tone: "blue" },
      { label: "Backlog value", value: usd(backlogValue), note: "Est. WO dollars", tone: "cyan" },
      { label: "Overdue", value: overdue, note: "Past must-leave/due", tone: overdue > 0 ? "red" : "green" },
      { label: "Due within 7 days", value: dueSoon, note: "At-risk window", tone: dueSoon > 0 ? "amber" : "green" }
    ],
    widgets: [
      { kind: "bar", id: "backlog-by-customer", title: "Backlog value by customer (top 8)", unit: "$", items: topCustomers },
      {
        kind: "table",
        id: "active-work-orders",
        title: "Active work orders (soonest due first)",
        columns: [
          { key: "wo", label: "Work order" },
          { key: "customer", label: "Customer" },
          { key: "part", label: "Part" },
          { key: "status", label: "Status" },
          { key: "due", label: "Must leave / due" },
          { key: "value", label: "Est. value (USD)", numeric: true }
        ],
        rows: sorted.slice(0, 200).map((r) => ({
          wo: r.number,
          customer: r.customer,
          part: r.part,
          status: r.status,
          due: fmtDate(r.due),
          value: Math.round(r.value)
        })),
        emptyLabel: "No active work orders."
      }
    ]
  };
}

/**
 * ProShop Backlog — prefers the local sync mirror (fast, survives ProShop
 * downtime), falling back to a live read when nothing has been synced yet.
 * ProShop remains the system of record.
 */
export async function loadProShopBacklog(ctx: DashboardContext): Promise<DashboardData> {
  if (!isProShopConfigured()) {
    return {
      note: "ProShop is not connected. Set PROSHOP_ROOT and a token (or client id/secret) to enable this read-only backlog. See docs/proshop-integration.md.",
      kpis: [{ label: "ProShop", value: "Not connected", note: "Read-only integration", tone: "amber" }],
      widgets: []
    };
  }

  const [refs, lastRun] = await Promise.all([
    prisma.proShopWorkOrderRef.findMany({
      where: { organizationId: ctx.organizationId, source: "proshop", syncStatus: "synced" },
      orderBy: [{ mustLeaveBy: "asc" }, { dueAt: "asc" }]
    }),
    prisma.proShopSyncRun.findFirst({
      where: { organizationId: ctx.organizationId, module: "work_orders" },
      orderBy: { startedAt: "desc" }
    })
  ]);

  if (refs.length > 0) {
    const rows: BacklogRow[] = refs.map((r) => ({
      number: r.externalNumber,
      customer: r.customerName ?? "—",
      part: r.partNumber ?? "—",
      status: r.status ?? "—",
      due: r.mustLeaveBy ?? r.dueAt ?? null,
      value: r.estValue ? Number(r.estValue) : 0
    }));
    const health = lastRun ? `${lastRun.status}` : "unknown";
    return build(
      rows,
      `Local mirror of ProShop (system of record). Last sync ${fmtWhen(lastRun?.finishedAt ?? lastRun?.startedAt ?? null)} (${health}). Manage at /erp/integrations/proshop.`
    );
  }

  // No mirror yet — live fallback so the dashboard still works pre-sync.
  const { records, error } = await fetchActiveWorkOrders();
  if (error) {
    return {
      note: `No local mirror yet, and live fetch failed: ${error}. Run a sync at /erp/integrations/proshop.`,
      kpis: [{ label: "ProShop", value: "Error", note: "See note above", tone: "red" }],
      widgets: []
    };
  }
  const rows: BacklogRow[] = records.map((wo) => ({
    number: wo.workOrderNumber ?? "—",
    customer: wo.customerPlainText ?? "—",
    part: wo.partPlainText ?? "—",
    status: wo.status ?? "—",
    due: workOrderDue(wo),
    value: typeof wo.estWODollarAmount === "number" ? wo.estWODollarAmount : 0
  }));
  return build(
    rows,
    "Live from ProShop (no local mirror yet). Run a sync at /erp/integrations/proshop to enable the fast, downtime-resilient mirror."
  );
}
