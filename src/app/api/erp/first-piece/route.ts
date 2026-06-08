import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  wo: z.string().min(1).max(60),
  partNumber: z.string().max(120).optional(),
  customer: z.string().max(160).optional(),
  workCenter: z.string().max(120).optional(),
  runNumber: z.coerce.number().int().min(1).max(99).optional(),
  opNumber: z.string().max(40).optional(),
  inspectionMethod: z.string().max(60).optional(),
  setupTech: z.string().max(80).optional(),
  status: z.string().max(40).optional(),
  result: z.string().max(40).optional(),
  defectCode: z.string().max(160).optional(),
  dmaxLab: z.string().max(60).optional(),
  opStartDate: z.string().optional(),
  detail: z.string().max(2000).optional()
});

// Logging a first-piece run is a shop-floor action — any ERP user may log one.
export async function POST(request: Request) {
  try {
    const user = await requirePermission("erp:view");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw);

    const created = await prisma.firstPieceRun.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        updatedById: user.id,
        ownerId: user.id,
        departmentId: user.departmentId,
        wo: body.wo,
        partNumber: body.partNumber,
        customer: body.customer,
        workCenter: body.workCenter,
        runNumber: body.runNumber,
        opNumber: body.opNumber,
        inspectionMethod: body.inspectionMethod,
        setupTech: body.setupTech,
        status: body.status ?? "On Cycle",
        result: body.result,
        defectCode: body.defectCode,
        dmaxLab: body.dmaxLab,
        opStartDate: body.opStartDate ? new Date(body.opStartDate) : null,
        detail: body.detail
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "first_piece_run.create",
      entityType: "first_piece_run",
      entityId: created.id,
      after: created
    });
    return ok({ record: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
