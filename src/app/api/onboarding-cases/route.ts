import { canAccessDepartment, departmentScopeForUser, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { recordNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { onboardingCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("onboarding:view");
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");

    if (departmentId && !canAccessDepartment(user, departmentId)) {
      throw new HttpError(403, "You cannot view onboarding cases for that department.", "department_scope_denied");
    }

    const cases = await prisma.onboardingCase.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(departmentId ? { departmentId } : {}),
        ...(status ? { status } : {}),
        ...departmentScopeForUser(user)
      },
      orderBy: [{ startDate: "asc" }, { updatedAt: "desc" }],
      take: 100
    });

    return ok({ cases });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("onboarding:create");
    const body = onboardingCreateSchema.parse(await request.json());
    if (!canAccessDepartment(user, body.departmentId)) {
      throw new HttpError(403, "You cannot create onboarding cases for that department.", "department_scope_denied");
    }

    const created = await prisma.$transaction(async (tx) => {
      const onboardingCase = await tx.onboardingCase.create({
        data: {
          ...body,
          organizationId: user.organizationId,
          caseNumber: recordNumber("ONB"),
          startDate: new Date(body.startDate),
          status: "Submitted",
          ownerId: body.managerId ?? user.id,
          createdById: user.id,
          updatedById: user.id
        }
      });

      await tx.onboardingStatusHistory.create({
        data: {
          organizationId: user.organizationId,
          onboardingCaseId: onboardingCase.id,
          toStatus: onboardingCase.status,
          changedById: user.id,
          departmentId: onboardingCase.departmentId,
          ownerId: onboardingCase.ownerId,
          createdById: user.id
        }
      });

      return onboardingCase;
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "onboarding.create",
      entityType: "onboarding_case",
      entityId: created.id,
      departmentId: created.departmentId,
      ownerId: created.ownerId,
      after: created
    });

    return ok({ case: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
