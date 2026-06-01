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

  // Last 6 month buckets (oldest → newest) for the trend.
  const now = new Date();
  const monthKeys: Array<{ key: string; label: string }> = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en", { month: "short" }).format(d)
    });
  }
  const trendSince = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [statusGroups, openValue, quotes, orderCount, customers, trendQuotes, opsAgg] = await Promise.all([
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
    prisma.customerAccount.findMany({ where, select: { id: true, name: true } }),
    prisma.quote.findMany({
      where: { ...where, createdAt: { gte: trendSince } },
      select: { createdAt: true, estimatedValue: true, status: true }
    }),
    prisma.workOrderOperation.aggregate({
      where: { organizationId: ctx.organizationId, archivedAt: null },
      _sum: { runHours: true, actualRunHours: true }
    })
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

  // Monthly trend buckets.
  const trendByMonth = new Map<string, { count: number; value: number; wonValue: number }>();
  for (const mk of monthKeys) trendByMonth.set(mk.key, { count: 0, value: 0, wonValue: 0 });
  for (const q of trendQuotes) {
    const key = `${q.createdAt.getFullYear()}-${String(q.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const b = trendByMonth.get(key);
    if (!b) continue;
    const v = q.estimatedValue ? Number(q.estimatedValue) : 0;
    b.count += 1;
    b.value += v;
    if (q.status === "WON") b.wonValue += v;
  }

  // Machine hours: planned vs actual run hours across operations.
  const planHours = opsAgg._sum.runHours ? Number(opsAgg._sum.runHours) : 0;
  const actualHours = opsAgg._sum.actualRunHours ? Number(opsAgg._sum.actualRunHours) : 0;
  const hoursVariancePct =
    planHours > 0 ? Math.round(((actualHours - planHours) / planHours) * 100) : null;

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
      {
        label: "Machine hours (plan vs actual)",
        value: `${Math.round(actualHours)} / ${Math.round(planHours)} h`,
        note: hoursVariancePct === null ? "No planned hours" : `${hoursVariancePct > 0 ? "+" : ""}${hoursVariancePct}% vs plan`,
        tone: hoursVariancePct === null ? "blue" : Math.abs(hoursVariancePct) <= 10 ? "green" : "amber"
      }
    ],
    widgets: [
      {
        kind: "table",
        id: "monthly-trend",
        title: "Monthly quote trend (last 6 months)",
        columns: [
          { key: "month", label: "Month" },
          { key: "count", label: "Quotes", numeric: true },
          { key: "value", label: "Quoted value (USD)", numeric: true },
          { key: "wonValue", label: "Won value (USD)", numeric: true }
        ],
        rows: monthKeys.map((mk) => {
          const b = trendByMonth.get(mk.key)!;
          return {
            month: mk.label,
            count: b.count,
            value: Math.round(b.value),
            wonValue: Math.round(b.wonValue)
          };
        }),
        emptyLabel: "No quotes in the last 6 months."
      },
      {
        kind: "bar",
        id: "quoted-value-by-month",
        title: "Quoted value by month",
        unit: "$",
        items: monthKeys.map((mk) => ({
          label: mk.label,
          value: Math.round(trendByMonth.get(mk.key)!.value),
          tone: "blue"
        }))
      },
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
