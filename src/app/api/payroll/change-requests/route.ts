import { canAccessDepartment, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { recordNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { payrollCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("payroll:view");
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");

    if (departmentId && !canAccessDepartment(user, departmentId)) {
      throw new HttpError(403, "You cannot view payroll coordination records for that department.", "department_scope_denied");
    }

    const requests = await prisma.payrollChangeRequest.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(departmentId ? { departmentId } : {}),
        ...(status ? { status } : {}),
        ...(user.userLevel === "MANAGER" ? { departmentId: user.departmentId ?? "__none__" } : {})
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 100
    });

    return ok({ requests });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("payroll:create");
    const body = payrollCreateSchema.parse(await request.json());
    if (!canAccessDepartment(user, body.departmentId)) {
      throw new HttpError(403, "You cannot create payroll requests for that department.", "department_scope_denied");
    }

    const created = await prisma.$transaction(async (tx) => {
      const payrollRequest = await tx.payrollChangeRequest.create({
        data: {
          organizationId: user.organizationId,
          requestNumber: recordNumber("PAY"),
          employeeProfileId: body.employeeProfileId,
          departmentId: body.departmentId,
          managerId: body.managerId ?? user.id,
          requestType: body.requestType,
          effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
          payrollPeriodId: body.payrollPeriodId,
          currentValueSummary: body.currentValueSummary,
          proposedChangeSummary: body.proposedChangeSummary,
          businessReason: body.businessReason,
          managerRecommendation: body.managerRecommendation,
          directorApprovalRequired: body.directorApprovalRequired,
          payrollAdminReviewRequired: body.payrollAdminReviewRequired,
          status: "Submitted",
          notes: body.notes,
          ownerId: body.managerId ?? user.id,
          createdById: user.id,
          updatedById: user.id
        }
      });

      await tx.payrollRequestStatusHistory.create({
        data: {
          organizationId: user.organizationId,
          payrollRequestId: payrollRequest.id,
          toStatus: payrollRequest.status,
          changedById: user.id,
          departmentId: payrollRequest.departmentId,
          ownerId: payrollRequest.ownerId,
          createdById: user.id
        }
      });

      return payrollRequest;
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "payroll_request.create",
      entityType: "payroll_change_request",
      entityId: created.id,
      departmentId: created.departmentId,
      ownerId: created.ownerId,
      reason: created.businessReason,
      after: created
    });

    return ok({ request: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
