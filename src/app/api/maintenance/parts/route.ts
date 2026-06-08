import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(80).optional(),
  subCategory: z.string().max(80).optional(),
  unit: z.string().max(40).optional(),
  quantityOnHand: z.coerce.number().int().min(0).optional(),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  critical: z.enum(["true", "false"]).optional(),
  location: z.string().max(120).optional(),
  vendor: z.string().max(120).optional(),
  notes: z.string().max(2000).optional()
});

export async function POST(request: Request) {
  try {
    const user = await requirePermission("maintenance:manage");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw);

    const created = await prisma.maintenancePart.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        updatedById: user.id,
        name: body.name,
        category: body.category,
        subCategory: body.subCategory,
        unit: body.unit ?? "each",
        quantityOnHand: body.quantityOnHand ?? 0,
        reorderPoint: body.reorderPoint ?? 0,
        critical: body.critical === "true",
        location: body.location,
        vendor: body.vendor,
        notes: body.notes
      }
    });
    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "maintenance_part.create",
      entityType: "maintenance_part",
      entityId: created.id,
      after: created
    });
    return ok({ record: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
