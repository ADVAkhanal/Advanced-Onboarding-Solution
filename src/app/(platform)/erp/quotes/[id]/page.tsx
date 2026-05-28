import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { formatShortDate } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { complexityLabel, diameterLabel, materialLabel, processLabel } from "@/lib/quoting";
import { DataTable, type Column } from "@/components/data-table";
import { QuoteStatusActions } from "./status-actions";

export const dynamic = "force-dynamic";

type LineRow = {
  id: string;
  description: string;
  bucketLabel: string;
  quantity: number;
  setupHours: number;
  cycleMinutesPerPiece: number;
  estimatedHours: number;
  unitPrice: number;
  lineTotal: number;
};

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission("quote:view");

  const quote = await prisma.quote.findFirst({
    where: { id: params.id, organizationId: user.organizationId, archivedAt: null }
  });
  if (!quote) {
    notFound();
  }

  const [lines, customer, owner, auditEntries] = await Promise.all([
    prisma.quoteLine.findMany({
      where: { organizationId: user.organizationId, quoteId: quote.id, archivedAt: null },
      orderBy: { createdAt: "asc" }
    }),
    quote.customerId
      ? prisma.customerAccount.findFirst({
          where: { id: quote.customerId, organizationId: user.organizationId }
        })
      : Promise.resolve(null),
    quote.ownerId
      ? prisma.user.findFirst({
          where: { id: quote.ownerId, organizationId: user.organizationId },
          select: { firstName: true, lastName: true, email: true }
        })
      : Promise.resolve(null),
    prisma.auditLog.findMany({
      where: {
        organizationId: user.organizationId,
        entityType: "quote",
        entityId: quote.id
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        actorId: true,
        outcome: true,
        reason: true,
        createdAt: true
      }
    })
  ]);

  const lineRows: LineRow[] = lines.map((line) => {
    const bucketParts: string[] = [];
    if (line.materialCategory) bucketParts.push(materialLabel(line.materialCategory));
    if (line.process) bucketParts.push(processLabel(line.process));
    if (line.complexityClass) bucketParts.push(complexityLabel(line.complexityClass));
    if (line.diameterClass && line.diameterClass !== "NOT_APPLICABLE") {
      bucketParts.push(diameterLabel(line.diameterClass));
    }
    const quantity = Number(line.quantity);
    const unitPrice = line.unitPrice ? Number(line.unitPrice) : 0;
    return {
      id: line.id,
      description: line.description,
      bucketLabel: bucketParts.join(" · ") || "—",
      quantity,
      setupHours: line.setupHours ? Number(line.setupHours) : 0,
      cycleMinutesPerPiece: line.cycleMinutesPerPiece ? Number(line.cycleMinutesPerPiece) : 0,
      estimatedHours: line.estimatedHours ? Number(line.estimatedHours) : 0,
      unitPrice,
      lineTotal: round2(unitPrice * quantity)
    };
  });

  const grandTotal = round2(lineRows.reduce((sum, row) => sum + row.lineTotal, 0));
  const totalHours = round2(lineRows.reduce((sum, row) => sum + row.estimatedHours, 0));

  const columns: Column<LineRow>[] = [
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <>
          <div style={{ fontWeight: 600 }}>{row.description}</div>
          <div className="metric-note">{row.bucketLabel}</div>
        </>
      )
    },
    {
      key: "quantity",
      header: "Qty",
      numeric: true,
      width: "80px",
      render: (row) => row.quantity
    },
    {
      key: "setup",
      header: "Setup hrs",
      numeric: true,
      width: "100px",
      render: (row) => row.setupHours.toFixed(2)
    },
    {
      key: "cycle",
      header: "Cycle min/pc",
      numeric: true,
      width: "110px",
      render: (row) => row.cycleMinutesPerPiece.toFixed(2)
    },
    {
      key: "estimatedHours",
      header: "Total hrs",
      numeric: true,
      width: "100px",
      render: (row) => row.estimatedHours.toFixed(2)
    },
    {
      key: "unitPrice",
      header: "Unit $",
      numeric: true,
      width: "110px",
      render: (row) => row.unitPrice.toFixed(4)
    },
    {
      key: "lineTotal",
      header: "Line total $",
      numeric: true,
      width: "130px",
      render: (row) => <strong>{row.lineTotal.toFixed(2)}</strong>
    }
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Quote · {statusLabel(quote.status)}</p>
          <h1>
            {quote.quoteNumber}: {quote.title}
          </h1>
          <p className="subhead">
            {customer ? customer.name : "No customer assigned"}
            {owner ? ` · Owner: ${owner.firstName ?? ""} ${owner.lastName ?? owner.email}` : ""}
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/erp/quotes">
            ← Back to quotes
          </Link>
        </div>
      </div>

      <div className="grid three-col">
        <section className="card">
          <div className="section-title">
            <h2>Header</h2>
            <span className={statusPillClass(quote.status)}>{statusLabel(quote.status)}</span>
          </div>
          <div className="card-pad">
            <ul className="compact-list">
              <li>
                <span>Priority</span>
                <strong>{quote.priority.replaceAll("_", " ")}</strong>
              </li>
              <li>
                <span>Due date</span>
                <strong>{formatShortDate(quote.dueDate)}</strong>
              </li>
              <li>
                <span>Valid until</span>
                <strong>{formatShortDate(quote.validUntil)}</strong>
              </li>
              <li>
                <span>Customer</span>
                <strong>{customer ? customer.name : "—"}</strong>
              </li>
              <li>
                <span>Created</span>
                <strong>{formatShortDate(quote.createdAt)}</strong>
              </li>
              <li>
                <span>Updated</span>
                <strong>{formatShortDate(quote.updatedAt)}</strong>
              </li>
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Totals</h2>
            <span className="pill">{lineRows.length} {lineRows.length === 1 ? "line" : "lines"}</span>
          </div>
          <div className="card-pad">
            <ul className="compact-list">
              <li>
                <span>Total estimated hours</span>
                <strong>{totalHours.toFixed(2)}</strong>
              </li>
              <li>
                <span>Margin target</span>
                <strong>
                  {quote.marginTarget ? `${Number(quote.marginTarget).toFixed(1)}%` : "—"}
                </strong>
              </li>
              <li>
                <span>Estimated value</span>
                <strong>${(quote.estimatedValue ? Number(quote.estimatedValue) : 0).toFixed(2)}</strong>
              </li>
              <li>
                <span>Sum of line totals</span>
                <strong>${grandTotal.toFixed(2)}</strong>
              </li>
            </ul>
            {Math.abs(grandTotal - (quote.estimatedValue ? Number(quote.estimatedValue) : 0)) >
            0.5 ? (
              <div className="pill amber" style={{ marginTop: 8 }}>
                Quote total and line sum differ — review before submitting.
              </div>
            ) : null}
          </div>
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Internal notes</h2>
          </div>
          <div className="card-pad">
            <p className="subhead" style={{ whiteSpace: "pre-wrap" }}>
              {quote.notes ?? "No internal notes recorded."}
            </p>
          </div>
        </section>
      </div>

      {user.permissions.includes("quote:price") ? (
        <section className="card" style={{ marginTop: 14 }}>
          <div className="section-title">
            <h2>Status actions</h2>
            <span className={statusPillClass(quote.status)}>{statusLabel(quote.status)}</span>
          </div>
          <div className="card-pad">
            <QuoteStatusActions
              quoteId={quote.id}
              currentStatus={quote.status}
              canSubmit={user.permissions.includes("quote:submit")}
            />
          </div>
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title">
          <h2>Quote lines</h2>
          <span className="pill">{lineRows.length}</span>
        </div>
        <div style={{ padding: "0 4px 4px" }}>
          <DataTable
            columns={columns}
            rows={lineRows}
            rowKey={(row) => row.id}
            caption="Quote lines"
            emptyLabel="No lines on this quote yet."
            stickyHeader={false}
          />
        </div>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title">
          <h2>Audit trail</h2>
          <span className="pill">{auditEntries.length}</span>
        </div>
        <div className="card-pad">
          {auditEntries.length === 0 ? (
            <p className="subhead">No audit entries yet.</p>
          ) : (
            <ul className="compact-list">
              {auditEntries.map((entry) => (
                <li key={entry.id}>
                  <span>
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    }).format(entry.createdAt)}
                    {" · "}
                    {entry.action}
                  </span>
                  <strong>
                    {entry.outcome ?? ""}
                    {entry.reason ? ` — ${entry.reason}` : ""}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function statusPillClass(status: string): string {
  if (status === "WON") return "pill green";
  if (status === "LOST" || status === "EXPIRED") return "pill red";
  if (status === "ON_HOLD") return "pill amber";
  return "pill";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
