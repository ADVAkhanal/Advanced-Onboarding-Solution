import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, ok } from "@/lib/http";
import { recordNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { reportCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePermission("report:view");
    const reports = await prisma.report.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(user.userLevel === "MANAGER" ? { departmentId: user.departmentId ?? "__none__" } : {})
      },
      orderBy: [{ generatedAt: "desc" }],
      take: 100
    });

    return ok({ reports });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("report:view");
    const body = reportCreateSchema.parse(await request.json());
    if (body.format) {
      await requirePermission("report:export");
    }

    const report = await prisma.report.create({
      data: {
        organizationId: user.organizationId,
        reportNumber: recordNumber("RPT"),
        reportType: body.reportType,
        title: body.title,
        generatedById: user.id,
        departmentId: body.departmentId,
        dateRangeStart: body.dateRangeStart ? new Date(body.dateRangeStart) : undefined,
        dateRangeEnd: body.dateRangeEnd ? new Date(body.dateRangeEnd) : undefined,
        filtersUsed: body.filtersUsed,
        summaryMetrics: {
          generatedAt: new Date().toISOString(),
          internalUseOnly: true
        },
        status: "Generated",
        createdById: user.id,
        updatedById: user.id,
        ownerId: user.id
      }
    });

    const exportRecord = body.format
      ? await prisma.reportExport.create({
          data: {
            organizationId: user.organizationId,
            reportId: report.id,
            format: body.format,
            exportedById: user.id,
            departmentId: body.departmentId,
            ownerId: user.id,
            createdById: user.id
          }
        })
      : null;

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: body.format ? "report.generate_and_export" : "report.generate",
      entityType: "report",
      entityId: report.id,
      departmentId: report.departmentId,
      ownerId: report.ownerId,
      after: { report, exportRecord }
    });

    return ok({ report, export: exportRecord }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
