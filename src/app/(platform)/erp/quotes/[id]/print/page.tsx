import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { formatShortDate } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { complexityLabel, diameterLabel, materialLabel, processLabel } from "@/lib/quoting";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export default async function QuotePrintPage({ params }: { params: { id: string } }) {
  const user = await requirePermission("quote:view");

  const quote = await prisma.quote.findFirst({
    where: { id: params.id, organizationId: user.organizationId, archivedAt: null }
  });
  if (!quote) {
    notFound();
  }

  const [organization, lines, customer] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { name: true, legalName: true, brandName: true }
    }),
    prisma.quoteLine.findMany({
      where: { organizationId: user.organizationId, quoteId: quote.id, archivedAt: null },
      orderBy: { createdAt: "asc" }
    }),
    quote.customerId
      ? prisma.customerAccount.findFirst({
          where: { id: quote.customerId, organizationId: user.organizationId },
          select: {
            name: true,
            primaryContactName: true,
            primaryEmail: true,
            billingCity: true,
            billingState: true
          }
        })
      : Promise.resolve(null)
  ]);

  const companyName =
    organization?.brandName || organization?.legalName || organization?.name || "Advanced PMC";

  const lineRows = lines.map((line) => {
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
      bucketLabel: bucketParts.join(" · "),
      quantity,
      unitPrice,
      lineTotal: round2(unitPrice * quantity)
    };
  });

  const grandTotal = round2(lineRows.reduce((sum, r) => sum + r.lineTotal, 0));
  const usd = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <>
      <div className="print-toolbar no-print">
        <Link className="button" href={`/erp/quotes/${quote.id}`}>
          ← Back to quote
        </Link>
        <PrintButton />
      </div>

      <article className="print-document">
        <header className="print-doc-header">
          <div className="print-doc-brand">
            <strong>{companyName}</strong>
            <span>Precision Manufacturing Quotation</span>
          </div>
          <div className="print-doc-meta">
            <div className="doc-title">Quote {quote.quoteNumber}</div>
            <div>Issued: {formatShortDate(quote.createdAt)}</div>
            <div>Valid until: {formatShortDate(quote.validUntil)}</div>
            <div>Status: {quote.status.replaceAll("_", " ")}</div>
          </div>
        </header>

        <section className="print-doc-grid">
          <div>
            <h4>Prepared for</h4>
            {customer ? (
              <>
                <div>
                  <strong>{customer.name}</strong>
                </div>
                {customer.primaryContactName ? <div>{customer.primaryContactName}</div> : null}
                {customer.primaryEmail ? <div>{customer.primaryEmail}</div> : null}
                {customer.billingCity || customer.billingState ? (
                  <div>
                    {[customer.billingCity, customer.billingState].filter(Boolean).join(", ")}
                  </div>
                ) : null}
              </>
            ) : (
              <div>No customer assigned</div>
            )}
          </div>
          <div>
            <h4>Quote details</h4>
            <div>{quote.title}</div>
            <div>Priority: {quote.priority.replaceAll("_", " ")}</div>
            {quote.dueDate ? <div>Requested by: {formatShortDate(quote.dueDate)}</div> : null}
          </div>
        </section>

        <table className="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th className="num">Qty</th>
              <th className="num">Unit price</th>
              <th className="num">Line total</th>
            </tr>
          </thead>
          <tbody>
            {lineRows.length === 0 ? (
              <tr>
                <td colSpan={5}>No line items on this quote.</td>
              </tr>
            ) : (
              lineRows.map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div>
                      <strong>{row.description}</strong>
                    </div>
                    {row.bucketLabel ? (
                      <div style={{ color: "#66758c", fontSize: 11 }}>{row.bucketLabel}</div>
                    ) : null}
                  </td>
                  <td className="num">{row.quantity}</td>
                  <td className="num">{usd(row.unitPrice)}</td>
                  <td className="num">{usd(row.lineTotal)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="print-totals">
          <table>
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td className="num">{usd(grandTotal)}</td>
              </tr>
              <tr className="grand">
                <td>Total (USD)</td>
                <td className="num">{usd(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer className="print-doc-footer">
          <p>
            This quotation is an estimate based on the information available at issue. Pricing is
            valid until the date shown above and is subject to review of final drawings,
            tolerances, and material certifications. Lead times are confirmed at order placement.
          </p>
          <p>
            {companyName} · Quote {quote.quoteNumber} · Generated{" "}
            {formatShortDate(new Date())} · Not a tax invoice. No payment is processed through
            this document.
          </p>
        </footer>
      </article>
    </>
  );
}
