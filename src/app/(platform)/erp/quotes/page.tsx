import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { decimalText, formatShortDate, getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";
import { DataTable, type Column } from "@/components/data-table";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "QUOTED", label: "Quoted" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "EXPIRED", label: "Expired" }
];

type QuoteRow = {
  id: string;
  quoteNumber: string;
  title: string;
  customerName: string;
  status: string;
  dueDate: Date | null;
  estimatedValue: unknown;
  lineCount: number;
  isOverdue: boolean;
};

export default async function QuotesPage({
  searchParams
}: {
  searchParams?: { status?: string };
}) {
  const user = await requirePermission("erp:view");
  if (user.userLevel === "USER") redirect("/erp/shop-floor");
  const refs = await getErpReferenceData(user);

  const requestedStatus = (searchParams?.status ?? "ALL").toUpperCase();
  const activeStatus = STATUS_FILTERS.some((option) => option.value === requestedStatus)
    ? requestedStatus
    : "ALL";

  const [quotes, orders] = await Promise.all([
    prisma.quote.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(activeStatus !== "ALL" ? { status: activeStatus } : {})
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 100
    }),
    prisma.salesOrder.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: [{ promisedDate: "asc" }, { updatedAt: "desc" }],
      take: 100
    })
  ]);

  // Quote ↔ QuoteLine has no Prisma relation defined (loose FK column),
  // so count lines via groupBy on the quoteId. Scoped to the org for safety.
  const lineCounts =
    quotes.length === 0
      ? []
      : await prisma.quoteLine.groupBy({
          by: ["quoteId"],
          where: {
            organizationId: user.organizationId,
            quoteId: { in: quotes.map((quote) => quote.id) },
            archivedAt: null
          },
          _count: { _all: true }
        });
  const lineCountByQuoteId = new Map(
    lineCounts.map((row) => [row.quoteId, row._count._all])
  );

  // Resolve customer names. Reference data already loads customers; map by id.
  const customersById = new Map(refs.customers.map((c) => [c.id, c.name]));
  const now = Date.now();
  const activeStatusesForOverdue = new Set(["DRAFT", "QUOTED"]);

  const customerOptions = refs.customers.map((customer) => ({
    label: customer.name,
    value: customer.id
  }));
  const quoteOptions = quotes.map((quote) => ({
    label: `${quote.quoteNumber} · ${quote.title}`,
    value: quote.id
  }));

  const rows: QuoteRow[] = quotes.map((quote) => ({
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    customerName: quote.customerId ? customersById.get(quote.customerId) ?? "Unknown" : "—",
    status: quote.status,
    dueDate: quote.dueDate,
    estimatedValue: quote.estimatedValue,
    lineCount: lineCountByQuoteId.get(quote.id) ?? 0,
    isOverdue:
      quote.dueDate != null &&
      quote.dueDate.getTime() < now &&
      activeStatusesForOverdue.has(quote.status)
  }));

  const columns: Column<QuoteRow>[] = [
    {
      key: "quoteNumber",
      header: "Quote",
      width: "180px",
      render: (row) => (
        <Link
          href={`/erp/quotes/${row.id}`}
          className="link"
          style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
        >
          {row.quoteNumber}
        </Link>
      )
    },
    {
      key: "title",
      header: "Title",
      render: (row) => row.title
    },
    {
      key: "customer",
      header: "Customer",
      width: "200px",
      render: (row) => row.customerName
    },
    {
      key: "dueDate",
      header: "Due",
      width: "120px",
      render: (row) =>
        row.dueDate ? (
          <span className={row.isOverdue ? "pill red" : undefined}>
            {formatShortDate(row.dueDate)}
          </span>
        ) : (
          <span className="metric-note">No date</span>
        )
    },
    {
      key: "lineCount",
      header: "Lines",
      numeric: true,
      width: "80px",
      render: (row) => row.lineCount
    },
    {
      key: "estimatedValue",
      header: "Value",
      numeric: true,
      width: "140px",
      render: (row) => decimalText(row.estimatedValue)
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (row) => (
        <span className={statusPill(row.status)}>{row.status.replaceAll("_", " ")}</span>
      )
    }
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Sales Operations</p>
          <h1>Quotes &amp; Orders</h1>
          <p className="subhead">
            Quote tracking, customer order handoff, safe estimated values, due dates, ownership,
            and status visibility without payment processing.
          </p>
        </div>
        <div className="actions">
          {user.permissions.includes("cycletime:view") ? (
            <Link className="button" href="/erp/quotes/cycle-times">
              Cycle-time lookups
            </Link>
          ) : null}
          {user.permissions.includes("quote:create") ? (
            <Link className="button primary" href="/erp/quotes/new">
              + Manufacturing quote
            </Link>
          ) : null}
        </div>
      </div>

      <div className="toolbar toolbar-between" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="tb-label">Filter by status</span>
          {STATUS_FILTERS.map((option) => (
            <Link
              key={option.value}
              href={option.value === "ALL" ? "/erp/quotes" : `/erp/quotes?status=${option.value}`}
              className={`filter-chip${activeStatus === option.value ? " active" : ""}`}
            >
              {option.label}
            </Link>
          ))}
        </div>
        <span className="tb-label">
          {rows.length} {rows.length === 1 ? "quote" : "quotes"}
        </span>
      </div>

      <div className="grid two-col">
        <ErpCreateForm
          title="Create Quote"
          endpoint="/api/erp/quotes"
          fields={[
            { name: "customerId", label: "Customer", type: "select", options: customerOptions },
            { name: "title", label: "Quote Title", required: true },
            { name: "dueDate", label: "Due Date", type: "date" },
            { name: "estimatedValue", label: "Estimated Value", type: "number" },
            {
              name: "priority",
              label: "Priority",
              type: "select",
              defaultValue: "NORMAL",
              options: ["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => ({
                label: value.replaceAll("_", " "),
                value
              }))
            },
            { name: "notes", label: "Internal Notes", type: "textarea" }
          ]}
        />
        <ErpCreateForm
          title="Create Sales Order"
          endpoint="/api/erp/sales-orders"
          fields={[
            { name: "customerId", label: "Customer", type: "select", options: customerOptions },
            { name: "quoteId", label: "Related Quote", type: "select", options: quoteOptions },
            { name: "customerPoNumber", label: "Customer PO Number" },
            { name: "promisedDate", label: "Promised Date", type: "date" },
            {
              name: "priority",
              label: "Priority",
              type: "select",
              defaultValue: "NORMAL",
              options: ["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => ({
                label: value.replaceAll("_", " "),
                value
              }))
            },
            { name: "notes", label: "Internal Notes", type: "textarea" }
          ]}
        />
      </div>

      <div className="grid two-col" style={{ marginTop: 14 }}>
        <section className="card">
          <div className="section-title">
            <h2>Quote Queue</h2>
            <span className="pill">{rows.length}</span>
          </div>
          <div style={{ maxHeight: 480, overflow: "auto" }}>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              caption="Quotes queue"
              emptyLabel={
                activeStatus === "ALL"
                  ? "No quotes recorded yet."
                  : `No quotes with status ${activeStatus}.`
              }
            />
          </div>
        </section>
        <section className="card">
          <div className="section-title">
            <h2>Sales Orders</h2>
            <span className="pill">{orders.length}</span>
          </div>
          {orders.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Customer PO</th>
                  <th scope="col">Promised</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber}</td>
                    <td>{order.customerPoNumber ?? "Not set"}</td>
                    <td>{formatShortDate(order.promisedDate)}</td>
                    <td>{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No sales orders recorded yet.</div>
          )}
        </section>
      </div>
    </>
  );
}

function statusPill(status: string): string {
  if (status === "WON") return "pill green";
  if (status === "LOST" || status === "EXPIRED") return "pill red";
  if (status === "ON_HOLD") return "pill amber";
  if (status === "QUOTED") return "pill";
  return "pill"; // DRAFT and unknown
}
