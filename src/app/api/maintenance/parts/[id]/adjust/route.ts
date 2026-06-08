import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  delta: z.coerce.number().int()
});

/** Adjust on-hand quantity by a signed delta (receive +, consume −). */
export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("maintenance:manage");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw);

    const part = await prisma.maintenancePart.findFirst({
      where: { id: context.params.id, organizationId: user.organizationId, archivedAt: null }
    });
    if (!part) {
      throw new HttpError(404, "Part not found.", "not_found");
    }

    const newQty = Math.max(0, part.quantityOnHand + body.delta);
    const updated = await prisma.maintenancePart.update({
      where: { id: part.id },
      data: { updatedById: user.id, quantityOnHand: newQty }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "maintenance_part.adjust",
      entityType: "maintenance_part",
      entityId: part.id,
      before: { quantityOnHand: part.quantityOnHand },
      after: { quantityOnHand: newQty, delta: body.delta }
    });

    return ok({ record: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
