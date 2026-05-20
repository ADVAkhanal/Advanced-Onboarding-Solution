import { canAccessDepartment, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { recordNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { timeOffCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("timeoff:view");
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");

    if (departmentId && !canAccessDepartment(user, departmentId)) {
      throw new HttpError(403, "You cannot view time-off requests for that department.", "department_scope_denied");
    }

    const requests = await prisma.timeOffRequest.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(departmentId ? { departmentId } : {}),
        ...(user.userLevel === "MANAGER" ? { departmentId: user.departmentId ?? "__none__" } : {}),
        ...(user.userLevel === "LEVEL_1" ? { createdById: user.id } : {})
      },
      orderBy: [{ startDate: "asc" }],
      take: 100
    });

    return ok({ requests });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("timeoff:create");
    const body = timeOffCreateSchema.parse(await request.json());
    if (!canAccessDepartment(user, body.departmentId) && user.userLevel !== "LEVEL_1") {
      throw new HttpError(403, "You cannot create time-off requests for that department.", "department_scope_denied");
    }

    const created = await prisma.timeOffRequest.create({
      data: {
        organizationId: user.organizationId,
        requestNumber: recordNumber("TO"),
        employeeProfileId: body.employeeProfileId,
        departmentId: body.departmentId,
        managerId: body.managerId,
        timeOffType: body.timeOffType,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        hoursRequested: body.hoursRequested,
        daysRequested: body.daysRequested,
        reason: body.reason,
        coveragePlan: body.coveragePlan,
        payrollNoteRequired: body.payrollNoteRequired,
        status: "Submitted",
        ownerId: body.managerId,
        createdById: user.id,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "timeoff.create",
      entityType: "time_off_request",
      entityId: created.id,
      departmentId: created.departmentId,
      ownerId: created.ownerId,
      after: created
    });

    return ok({ request: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
