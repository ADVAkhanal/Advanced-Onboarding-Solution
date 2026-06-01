import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { toCsv } from "@/lib/export/csv";
import { handleRouteError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUSES = ["ALL", "DRAFT", "QUOTED", "WON", "LOST", "ON_HOLD", "EXPIRED"];

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA").format(d); // YYYY-MM-DD, sortable in CSV
}

export async function GET(request: Request) {
  try {
    const user = await requirePermission("erp:view");

    const requested = (new URL(request.url).searchParams.get("status") ?? "ALL").toUpperCase();
    const status = STATUSES.includes(requested) ? requested : "ALL";

    const quotes = await prisma.quote.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(status !== "ALL" ? { status } : {})
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 5000
    });

    const customers = await prisma.customerAccount.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true }
    });
    const customerName = new Map(customers.map((c) => [c.id, c.name]));

    const lineCounts =
      quotes.length === 0
        ? []
        : await prisma.quoteLine.groupBy({
            by: ["quoteId"],
            where: {
              organizationId: user.organizationId,
              quoteId: { in: quotes.map((q) => q.id) },
              archivedAt: null
            },
            _count: { _all: true }
          });
    const lineCountByQuote = new Map(lineCounts.map((r) => [r.quoteId, r._count._all]));

    const columns = [
      { key: "quoteNumber", label: "Quote Number" },
      { key: "title", label: "Title" },
      { key: "customer", label: "Customer" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "dueDate", label: "Due Date" },
      { key: "validUntil", label: "Valid Until" },
      { key: "estimatedValue", label: "Estimated Value (USD)" },
      { key: "marginTarget", label: "Margin Target %" },
      { key: "lines", label: "Line Count" },
      { key: "createdAt", label: "Created" }
    ];

    const rows = quotes.map((q) => ({
      quoteNumber: q.quoteNumber,
      title: q.title,
      customer: q.customerId ? customerName.get(q.customerId) ?? "Unknown" : "",
      status: q.status,
      priority: q.priority,
      dueDate: fmtDate(q.dueDate),
      validUntil: fmtDate(q.validUntil),
      estimatedValue: q.estimatedValue ? Number(q.estimatedValue).toFixed(2) : "",
      marginTarget: q.marginTarget ? Number(q.marginTarget).toFixed(1) : "",
      lines: lineCountByQuote.get(q.id) ?? 0,
      createdAt: fmtDate(q.createdAt)
    }));

    const csv = toCsv(columns, rows);

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "quotes.export_csv",
      entityType: "quote",
      after: { status, count: rows.length }
    });

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=quotes-${status.toLowerCase()}.csv`
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
