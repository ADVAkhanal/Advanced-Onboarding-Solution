import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { erpWorkCenterSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("erp:manage");

    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = erpWorkCenterSchema.parse(raw);

    // Upsert by (org, code) so capacity edits update in place.
    const workCenter = await prisma.workCenter.upsert({
      where: { organizationId_code: { organizationId: user.organizationId, code: body.code } },
      create: {
        organizationId: user.organizationId,
        code: body.code,
        name: body.name,
        capacityHoursPerWeek: body.capacityHoursPerWeek,
        notes: body.notes,
        createdById: user.id,
        updatedById: user.id
      },
      update: {
        name: body.name,
        capacityHoursPerWeek: body.capacityHoursPerWeek,
        notes: body.notes,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "work_center.upsert",
      entityType: "work_center",
      entityId: workCenter.id,
      after: workCenter
    });

    return ok({ workCenter }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
