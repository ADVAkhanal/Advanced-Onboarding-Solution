import { isProShopConfigured } from "@/lib/proshop/client";
import { fetchActiveWorkOrders, workOrderDue } from "@/lib/proshop/work-orders";
import type { DashboardContext, DashboardData, Tone } from "./types";

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(d) : "—";
}

/**
 * ProShop Backlog — live, read-only view of active work orders pulled from
 * ProShop (the system of record). Disabled cleanly when PROSHOP_* env is
 * not set. Uses the confirmed Active Work Orders query.
 */
export async function loadProShopBacklog(_ctx: DashboardContext): Promise<DashboardData> {
  if (!isProShopConfigured()) {
    return {
      note: "ProShop is not connected. Set PROSHOP_ROOT and PROSHOP_API_TOKEN (or PROSHOP_CLIENT_ID + PROSHOP_CLIENT_SECRET) in the environment to enable this live, read-only backlog. See docs/proshop-integration.md.",
      kpis: [
        { label: "ProShop", value: "Not connected", note: "Read-only integration", tone: "amber" }
      ],
      widgets: []
    };
  }

  const { records, totalRecords, error } = await fetchActiveWorkOrders();

  if (error) {
    return {
      note: `Could not reach ProShop: ${error}`,
      kpis: [{ label: "ProShop", value: "Error", note: "See note above", tone: "red" }],
      widgets: []
    };
  }

  const now = Date.now();
  const in7 = now + 7 * 24 * 60 * 60 * 1000;
  let backlogValue = 0;
  let overdue = 0;
  let dueSoon = 0;
  for (const wo of records) {
    backlogValue += typeof wo.estWODollarAmount === "number" ? wo.estWODollarAmount : 0;
    const due = workOrderDue(wo);
    if (due) {
      if (due.getTime() < now) overdue += 1;
      else if (due.getTime() <= in7) dueSoon += 1;
    }
  }

  // Backlog value by customer (top 8).
  const byCustomer = new Map<string, number>();
  for (const wo of records) {
    const c = wo.customerPlainText || "Unknown";
    byCustomer.set(c, (byCustomer.get(c) ?? 0) + (typeof wo.estWODollarAmount === "number" ? wo.estWODollarAmount : 0));
  }
  const topCustomers = [...byCustomer.entries()]
    .map(([label, value]) => ({ label, value: Math.round(value), tone: "blue" as Tone }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Soonest-due work orders (table).
  const sorted = [...records].sort((a, b) => {
    const da = workOrderDue(a)?.getTime() ?? Infinity;
    const db = workOrderDue(b)?.getTime() ?? Infinity;
    return da - db;
  });

  return {
    note: "Live, read-only from ProShop (system of record). Active work orders. Cached ~30s.",
    kpis: [
      { label: "Active work orders", value: totalRecords || records.length, note: "Status = Active", tone: "blue" },
      { label: "Backlog value", value: usd(backlogValue), note: "Est. WO dollars", tone: "cyan" },
      { label: "Overdue", value: overdue, note: "Past must-leave/due", tone: overdue > 0 ? "red" : "green" },
      { label: "Due within 7 days", value: dueSoon, note: "At-risk window", tone: dueSoon > 0 ? "amber" : "green" }
    ],
    widgets: [
      {
        kind: "bar",
        id: "backlog-by-customer",
        title: "Backlog value by customer (top 8)",
        unit: "$",
        items: topCustomers
      },
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
        rows: sorted.slice(0, 200).map((wo) => ({
          wo: wo.workOrderNumber ?? "—",
          customer: wo.customerPlainText ?? "—",
          part: wo.partPlainText ?? "—",
          status: wo.status ?? "—",
          due: fmtDate(workOrderDue(wo)),
          value: typeof wo.estWODollarAmount === "number" ? Math.round(wo.estWODollarAmount) : 0
        })),
        emptyLabel: "No active work orders returned."
      }
    ]
  };
}
