import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.string().max(40).optional(),
  result: z.string().max(40).optional(),
  defectCode: z.string().max(160).optional(),
  setupTech: z.string().max(80).optional(),
  inspectionMethod: z.string().max(60).optional(),
  detail: z.string().max(2000).optional()
});

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("erp:view");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw);

    const existing = await prisma.firstPieceRun.findFirst({
      where: { id: context.params.id, organizationId: user.organizationId, archivedAt: null }
    });
    if (!existing) {
      throw new HttpError(404, "First-piece run not found.", "not_found");
    }

    const updated = await prisma.firstPieceRun.update({
      where: { id: existing.id },
      data: {
        updatedById: user.id,
        status: body.status ?? existing.status,
        result: body.result ?? existing.result,
        defectCode: body.defectCode ?? existing.defectCode,
        setupTech: body.setupTech ?? existing.setupTech,
        inspectionMethod: body.inspectionMethod ?? existing.inspectionMethod,
        detail: body.detail ?? existing.detail
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "first_piece_run.update",
      entityType: "first_piece_run",
      entityId: updated.id,
      before: existing,
      after: updated
    });
    return ok({ record: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
