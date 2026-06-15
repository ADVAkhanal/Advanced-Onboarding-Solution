import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requirePermission } from "@/lib/auth";
import { formatShortDate } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { PrintDocument, PrintToolbar } from "@/components/print-document";
import { qrSvg } from "@/lib/qr";
import { confirmPath, newConfirmToken } from "@/lib/shipnotify";

export const dynamic = "force-dynamic";

function baseUrl(): string {
  const env = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  if (env) return env;
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "";
}

export default async function PackingSlipPage({ params }: { params: { id: string } }) {
  const user = await requirePermission("erp:manage");

  let shipment = await prisma.shipment.findFirst({
    where: { id: params.id, organizationId: user.organizationId, archivedAt: null }
  });
  if (!shipment) {
    notFound();
  }
  // Arm the QR on first print if the shipment has not been notified yet
  // (idempotent — only mints when no token exists).
  if (!shipment.confirmToken) {
    shipment = await prisma.shipment.update({
      where: { id: shipment.id },
      data: { confirmToken: newConfirmToken(), updatedById: user.id }
    });
  }

  const [organization, customer] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { name: true, legalName: true, brandName: true }
    }),
    shipment.customerId
      ? prisma.customerAccount.findFirst({
          where: { id: shipment.customerId, organizationId: user.organizationId },
          select: { name: true, primaryContactName: true, billingCity: true, billingState: true }
        })
      : Promise.resolve(null)
  ]);

  const companyName =
    organization?.brandName || organization?.legalName || organization?.name || "Advanced PMC";
  const url = `${baseUrl()}${confirmPath(shipment.confirmToken!)}`;
  const qr = qrSvg(url, { scale: 4, margin: 2 });

  return (
    <>
      <PrintToolbar backHref="/erp/shipping" backLabel="← Back to shipping" />

      <PrintDocument
        company={companyName}
        kicker="Packing Slip"
        title={`Shipment ${shipment.shipmentNumber}`}
        meta={
          <>
            <div>Ship date: {formatShortDate(shipment.shipDate)}</div>
            <div>Status: {shipment.status.replaceAll("_", " ")}</div>
            {shipment.carrierName ? <div>Carrier: {shipment.carrierName}</div> : null}
          </>
        }
        footer={
          <p>
            {companyName} · Packing slip for shipment {shipment.shipmentNumber} · Generated{" "}
            {formatShortDate(new Date())}. Scan the QR code to confirm receipt — no login required.
          </p>
        }
      >
        <section className="print-doc-grid">
          <div>
            <h4>Ship to</h4>
            {customer ? (
              <>
                <div>
                  <strong>{customer.name}</strong>
                </div>
                {shipment.recipientName ? <div>Attn: {shipment.recipientName}</div> : customer.primaryContactName ? <div>Attn: {customer.primaryContactName}</div> : null}
                {customer.billingCity || customer.billingState ? (
                  <div>{[customer.billingCity, customer.billingState].filter(Boolean).join(", ")}</div>
                ) : null}
              </>
            ) : shipment.recipientName ? (
              <div>
                <strong>{shipment.recipientName}</strong>
              </div>
            ) : (
              <div>No recipient assigned</div>
            )}
          </div>
          <div>
            <h4>Shipment details</h4>
            {shipment.trackingNumber ? <div>Tracking: {shipment.trackingNumber}</div> : null}
            <div>Priority: {shipment.priority.replaceAll("_", " ")}</div>
            {shipment.notes ? <div style={{ color: "#66758c", fontSize: 11 }}>{shipment.notes}</div> : null}
          </div>
        </section>

        <section className="packing-confirm">
          <div className="packing-qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="packing-confirm-text">
            <h4>Confirm receipt</h4>
            <p>Scan this code with any phone camera to confirm the shipment arrived.</p>
            <p className="packing-confirm-url">{url}</p>
            {shipment.confirmedAt ? (
              <p className="pill green">
                Confirmed {formatShortDate(shipment.confirmedAt)}
                {shipment.confirmedByName ? ` by ${shipment.confirmedByName}` : ""}
              </p>
            ) : null}
          </div>
        </section>
      </PrintDocument>
    </>
  );
}
