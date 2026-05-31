import { prisma } from "@/lib/prisma";
import type { DashboardContext, DashboardData, DonutSegment, Tone } from "./types";

const OPEN_STATUSES = ["DRAFT", "QUOTED", "ON_HOLD"];

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(n);
}

function statusTone(status: string): Tone {
  if (status === "WON") return "green";
  if (status === "LOST" || status === "EXPIRED") return "red";
  if (status === "ON_HOLD") return "amber";
  return "blue";
}

/**
 * Sales-Advanced — quoting pipeline health.
 * Reimagines the ADVAkhanal/Sales-Advanced dashboard over live Quote /
 * SalesOrder / CustomerAccount data.
 */
export async function loadSalesAdvanced(ctx: DashboardContext): Promise<DashboardData> {
  const where = { organizationId: ctx.organizationId, archivedAt: null };

  const [statusGroups, openValue, quotes, orderCount, customers] = await Promise.all([
    prisma.quote.groupBy({ by: ["status"], where, _count: { _all: true }, _sum: { estimatedValue: true } }),
    prisma.quote.aggregate({
      where: { ...where, status: { in: OPEN_STATUSES } },
      _sum: { estimatedValue: true }
    }),
    prisma.quote.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: { id: true, quoteNumber: true, title: true, customerId: true, status: true, estimatedValue: true, updatedAt: true }
    }),
    prisma.salesOrder.count({ where: { ...where, status: { notIn: ["CLOSED", "CANCELLED"] } } }),
    prisma.customerAccount.findMany({ where, select: { id: true, name: true } })
  ]);

  const countByStatus = new Map(statusGroups.map((g) => [g.status, g._count._all]));
  const valueByStatus = new Map(
    statusGroups.map((g) => [g.status, g._sum.estimatedValue ? Number(g._sum.estimatedValue) : 0])
  );
  const customerName = new Map(customers.map((c) => [c.id, c.name]));

  const won = countByStatus.get("WON") ?? 0;
  const lost = countByStatus.get("LOST") ?? 0;
  const decided = won + lost;
  const winRate = decided > 0 ? Math.round((won / decided) * 100) : null;
  const totalQuotes = Array.from(countByStatus.values()).reduce((a, b) => a + b, 0);
  const open = openValue._sum.estimatedValue ? Number(openValue._sum.estimatedValue) : 0;
  const openCount = OPEN_STATUSES.reduce((s, st) => s + (countByStatus.get(st) ?? 0), 0);
  const avgQuote =
    totalQuotes > 0
      ? Array.from(valueByStatus.values()).reduce((a, b) => a + b, 0) / totalQuotes
      : 0;

  // Top customers by open quote value.
  const openByCustomer = new Map<string, number>();
  // Re-pull open quotes grouped by customer for the leaderboard.
  const openQuotes = await prisma.quote.findMany({
    where: { ...where, status: { in: OPEN_STATUSES } },
    select: { customerId: true, estimatedValue: true }
  });
  for (const q of openQuotes) {
    if (!q.customerId) continue;
    openByCustomer.set(
      q.customerId,
      (openByCustomer.get(q.customerId) ?? 0) + (q.estimatedValue ? Number(q.estimatedValue) : 0)
    );
  }
  const topCustomers = [...openByCustomer.entries()]
    .map(([id, value]) => ({ name: customerName.get(id) ?? "Unknown", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const STATUS_ORDER = ["DRAFT", "QUOTED", "WON", "LOST", "ON_HOLD", "EXPIRED"];
  const donutSegments: DonutSegment[] = STATUS_ORDER.filter((s) => (countByStatus.get(s) ?? 0) > 0).map(
    (s) => ({ label: `${s.replaceAll("_", " ")} (${countByStatus.get(s)})`, value: countByStatus.get(s) ?? 0, tone: statusTone(s) })
  );

  return {
    kpis: [
      { label: "Open quote value", value: usd(open), note: `${openCount} open`, tone: "blue" },
      {
        label: "Win rate",
        value: winRate === null ? "—" : `${winRate}%`,
        note: winRate === null ? "No decided quotes" : `${won} won · ${lost} lost`,
        tone: winRate !== null && winRate >= 50 ? "green" : "amber"
      },
      { label: "Open sales orders", value: orderCount, note: "Not closed/cancelled", tone: "cyan" },
      { label: "Avg quote value", value: usd(avgQuote), note: `${totalQuotes} quotes`, tone: "blue" }
    ],
    widgets: [
      {
        kind: "bar",
        id: "value-by-status",
        title: "Quote value by status",
        unit: "$",
        items: STATUS_ORDER.filter((s) => (valueByStatus.get(s) ?? 0) > 0).map((s) => ({
          label: s.replaceAll("_", " "),
          value: Math.round(valueByStatus.get(s) ?? 0),
          tone: statusTone(s)
        }))
      },
      {
        kind: "donut",
        id: "count-by-status",
        title: "Quote count by status",
        centerLabel: `${totalQuotes} total`,
        segments: donutSegments
      },
      {
        kind: "table",
        id: "top-customers",
        title: "Top customers by open quote value",
        columns: [
          { key: "customer", label: "Customer" },
          { key: "value", label: "Open value (USD)", numeric: true }
        ],
        rows: topCustomers.map((c) => ({ customer: c.name, value: Math.round(c.value) })),
        emptyLabel: "No open quotes."
      },
      {
        kind: "table",
        id: "recent-quotes",
        title: "Recent quotes",
        columns: [
          { key: "quote", label: "Quote" },
          { key: "customer", label: "Customer" },
          { key: "status", label: "Status" },
          { key: "value", label: "Value (USD)", numeric: true }
        ],
        rows: quotes.map((q) => ({
          quote: q.quoteNumber,
          customer: q.customerId ? customerName.get(q.customerId) ?? "Unknown" : "—",
          status: q.status,
          value: q.estimatedValue ? Math.round(Number(q.estimatedValue)) : 0
        })),
        emptyLabel: "No quotes yet."
      }
    ]
  };
}
