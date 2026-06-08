import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
  category: z.string().max(40).optional(),
  building: z.coerce.number().int().min(1).max(99).optional(),
  manufacturer: z.string().max(120).optional(),
  serial: z.string().max(120).optional(),
  envelope: z.string().max(160).optional(),
  footprint: z.string().max(80).optional(),
  status: z.enum(["running", "down", "pm", "idle", "moving"]).optional(),
  notes: z.string().max(2000).optional()
});

export async function POST(request: Request) {
  try {
    const user = await requirePermission("maintenance:manage");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw);
    const created = await prisma.machine.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        updatedById: user.id,
        code: body.code,
        name: body.name,
        category: body.category ?? "Support",
        building: body.building,
        manufacturer: body.manufacturer,
        serial: body.serial,
        envelope: body.envelope,
        footprint: body.footprint,
        status: body.status ?? "running",
        notes: body.notes
      }
    });
    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "machine.create",
      entityType: "machine",
      entityId: created.id,
      after: created
    });
    return ok({ record: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
