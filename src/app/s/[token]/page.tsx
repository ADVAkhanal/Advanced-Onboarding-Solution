import { prisma } from "@/lib/prisma";
import { ConfirmForm } from "./confirm-form";

export const dynamic = "force-dynamic";

function fmt(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d) : "";
}

/**
 * Public shipment confirmation page (no login). Reached by scanning the QR on
 * the packing slip. Exposes only the shipment number and confirmation state —
 * no customer or operational data.
 */
export default async function ConfirmPage({ params }: { params: { token: string } }) {
  const shipment = await prisma.shipment.findFirst({
    where: { confirmToken: params.token, archivedAt: null },
    select: { shipmentNumber: true, status: true, confirmedAt: true, confirmedByName: true }
  });

  return (
    <main className="public-confirm">
      <div className="public-confirm-card">
        <div className="public-confirm-brand">{process.env.COMPANY_NAME || "Advanced PMC"}</div>
        {!shipment ? (
          <>
            <h1>Link not found</h1>
            <p>This confirmation link is invalid or has expired. Please contact your supplier.</p>
          </>
        ) : shipment.confirmedAt ? (
          <>
            <div className="public-confirm-check" aria-hidden="true">✓</div>
            <h1>Receipt confirmed</h1>
            <p>
              Shipment <strong>{shipment.shipmentNumber}</strong> was confirmed received
              {shipment.confirmedByName ? ` by ${shipment.confirmedByName}` : ""} on {fmt(shipment.confirmedAt)}.
            </p>
            <p className="public-confirm-note">Thank you — no further action is needed.</p>
          </>
        ) : (
          <>
            <h1>Confirm receipt</h1>
            <p>
              Please confirm you received shipment <strong>{shipment.shipmentNumber}</strong>.
            </p>
            <ConfirmForm token={params.token} shipmentNumber={shipment.shipmentNumber} />
          </>
        )}
      </div>
    </main>
  );
}
