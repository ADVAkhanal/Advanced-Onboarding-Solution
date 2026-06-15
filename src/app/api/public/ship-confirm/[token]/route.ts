import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { appError } from "@/lib/error-codes";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendPushoverAlert } from "@/lib/pushover";

export const dynamic = "force-dynamic";

const schema = z.object({ confirmedByName: z.string().min(1).max(160) });

/**
 * Public shipment confirmation (no auth). The opaque token resolves to exactly
 * one shipment; we expose only the shipment number and confirmation state — no
 * customer or operational data. Confirmation is idempotent and fires an internal
 * alert back to the shop.
 */
export async function POST(request: Request, context: { params: { token: string } }) {
  try {
    const raw = await request.json().catch(() => ({}));
    const { confirmedByName } = schema.parse(raw);

    const shipment = await prisma.shipment.findFirst({
      where: { confirmToken: context.params.token, archivedAt: null }
    });
    if (!shipment) throw appError("SHIP-404");

    if (shipment.confirmedAt) {
      return ok({
        record: {
          shipmentNumber: shipment.shipmentNumber,
          confirmedAt: shipment.confirmedAt,
          confirmedByName: shipment.confirmedByName
        },
        alreadyConfirmed: true
      });
    }

    const updated = await prisma.shipment.update({
      where: { id: shipment.id },
      data: { confirmedAt: new Date(), confirmedByName, status: "DELIVERED" }
    });

    await sendPushoverAlert({
      organizationId: shipment.organizationId,
      eventType: "shipment_confirmed",
      title: `Shipment ${shipment.shipmentNumber} confirmed received`,
      message: `${confirmedByName} confirmed receipt of shipment ${shipment.shipmentNumber}.`,
      departmentId: shipment.departmentId,
      ownerId: shipment.ownerId
    });

    await recordAudit({
      organizationId: shipment.organizationId,
      actorId: null,
      action: "shipment.confirmed",
      entityType: "shipment",
      entityId: shipment.id,
      reason: "public_confirm",
      after: { confirmedByName }
    });

    return ok({
      record: {
        shipmentNumber: updated.shipmentNumber,
        confirmedAt: updated.confirmedAt,
        confirmedByName
      },
      alreadyConfirmed: false
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
