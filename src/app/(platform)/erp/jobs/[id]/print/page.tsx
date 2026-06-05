import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { decimalText, formatShortDate } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { PrintDocument, PrintToolbar } from "@/components/print-document";

export const dynamic = "force-dynamic";

/**
 * Work Order Traveler — a printable shop-floor / customer document for a
 * single work order and its operations. Uses the shared PrintDocument
 * template; print-CSS strips app chrome for a clean PDF.
 */
export default async function WorkOrderTravelerPage({ params }: { params: { id: string } }) {
  const user = await requirePermission("erp:view");

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: params.id, organizationId: user.organizationId, archivedAt: null }
  });
  if (!workOrder) {
    notFound();
  }

  const [organization, operations, customer, part] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { name: true, legalName: true, brandName: true }
    }),
    prisma.workOrderOperation.findMany({
      where: { organizationId: user.organizationId, workOrderId: workOrder.id, archivedAt: null },
      orderBy: { operationNumber: "asc" }
    }),
    workOrder.customerId
      ? prisma.customerAccount.findFirst({
          where: { id: workOrder.customerId, organizationId: user.organizationId },
          select: { name: true, accountNumber: true }
        })
      : Promise.resolve(null),
    workOrder.partId
      ? prisma.part.findFirst({
          where: { id: workOrder.partId, organizationId: user.organizationId },
          select: { partNumber: true, revision: true, description: true }
        })
      : Promise.resolve(null)
  ]);

  const company = organization?.brandName || organization?.legalName || organization?.name || "Advanced PMC";

  return (
    <>
      <PrintToolbar backHref="/erp/jobs" backLabel="← Back to jobs" />

      <PrintDocument
        company={company}
        kicker="Work Order Traveler"
        title={`WO ${workOrder.workOrderNumber}`}
        meta={
          <>
            <div>Due: {formatShortDate(workOrder.dueDate)}</div>
            <div>Qty: {decimalText(workOrder.quantity)}</div>
            <div>Status: {workOrder.status.replaceAll("_", " ")}</div>
          </>
        }
        footer={
          <p>
            {company} · WO {workOrder.workOrderNumber} · Generated {formatShortDate(new Date())} ·
            Operational traveler. No controlled (CUI/ITAR) technical data is included on this
            document.
          </p>
        }
      >
        <section className="print-doc-grid">
          <div>
            <h4>Part</h4>
            {part ? (
              <>
                <div><strong>{part.partNumber} Rev {part.revision}</strong></div>
                <div>{part.description}</div>
              </>
            ) : (
              <div>No part linked</div>
            )}
          </div>
          <div>
            <h4>Customer</h4>
            {customer ? (
              <>
                <div><strong>{customer.name}</strong></div>
                <div>{customer.accountNumber}</div>
              </>
            ) : (
              <div>No customer assigned</div>
            )}
          </div>
        </section>

        <table className="print-table">
          <thead>
            <tr>
              <th className="num">Op</th>
              <th>Work center</th>
              <th>Description</th>
              <th className="num">Setup h</th>
              <th className="num">Run h</th>
              <th>Status</th>
              <th>Sign-off</th>
            </tr>
          </thead>
          <tbody>
            {operations.length === 0 ? (
              <tr>
                <td colSpan={7}>No operations on this work order.</td>
              </tr>
            ) : (
              operations.map((op) => (
                <tr key={op.id}>
                  <td className="num">{op.operationNumber}</td>
                  <td>{op.workCenter}</td>
                  <td>{op.description}</td>
                  <td className="num">{op.setupHours != null ? decimalText(op.setupHours) : "—"}</td>
                  <td className="num">{op.runHours != null ? decimalText(op.runHours) : "—"}</td>
                  <td>{op.status}</td>
                  {/* Blank sign-off cell for shop-floor initials on the printed traveler. */}
                  <td style={{ minWidth: 90 }}>&nbsp;</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {workOrder.notes ? (
          <section style={{ marginTop: 14 }}>
            <h4 style={{ margin: "0 0 4px", fontSize: 11, textTransform: "uppercase", color: "var(--muted)" }}>
              Notes
            </h4>
            <p style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{workOrder.notes}</p>
          </section>
        ) : null}
      </PrintDocument>
    </>
  );
}
