import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { appError } from "@/lib/error-codes";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { sendPushoverAlert } from "@/lib/pushover";
import { confirmUrl, newConfirmToken } from "@/lib/shipnotify";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    recipientName: z.string().max(160).optional(),
    recipientEmail: z.string().email().max(200).optional(),
    force: z.boolean().optional()
  })
  .optional();

/**
 * Mark a shipment ready/shipped and arm its confirmation loop: generate a
 * confirm token (once), alert shop staff via Pushover with the recipient
 * confirm URL, and stamp notifiedAt. Idempotent — re-posting does not re-send
 * unless { force: true } is provided.
 */
export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("erp:manage");
    const raw = await request.json().catch(() => ({}));
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw) ?? {};

    const shipment = await prisma.shipment.findFirst({
      where: { id: context.params.id, organizationId: user.organizationId, archivedAt: null }
    });
    if (!shipment) throw appError("SHIP-404");

    const token = shipment.confirmToken ?? newConfirmToken();
    const url = confirmUrl(request, token);
    const recipientName = body.recipientName ?? shipment.recipientName ?? null;
    const recipientEmail = body.recipientEmail ?? shipment.recipientEmail ?? null;
    const alreadyNotified = Boolean(shipment.notifiedAt);

    let sent = false;
    if (!alreadyNotified || body.force) {
      const result = await sendPushoverAlert({
        organizationId: user.organizationId,
        eventType: "shipment_notify",
        title: `Shipment ${shipment.shipmentNumber} ready to ship`,
        message: `Print the packing slip and include the QR. Recipient confirms receipt at ${url}`,
        departmentId: shipment.departmentId,
        ownerId: shipment.ownerId,
        createdById: user.id
      });
      sent = result.sent;
    }

    const updated = await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        confirmToken: token,
        recipientName,
        recipientEmail,
        notifiedAt: shipment.notifiedAt ?? new Date(),
        status: shipment.status === "PLANNED" ? "SHIPPED" : shipment.status,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "shipment.notify",
      entityType: "shipment",
      entityId: shipment.id,
      after: { notifiedAt: updated.notifiedAt, sent, alreadyNotified }
    });

    return ok({ record: updated, confirmUrl: url, sent, alreadyNotified });
  } catch (error) {
    return handleRouteError(error);
  }
}
