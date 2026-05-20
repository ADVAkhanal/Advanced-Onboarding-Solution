import { canAccessDepartment, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { recordNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { attendanceIssueCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("attendance:view");
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");

    if (departmentId && !canAccessDepartment(user, departmentId)) {
      throw new HttpError(403, "You cannot view attendance records for that department.", "department_scope_denied");
    }

    const records = await prisma.attendanceIssueRecord.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(departmentId ? { departmentId } : {}),
        ...(user.userLevel === "MANAGER" ? { departmentId: user.departmentId ?? "__none__" } : {})
      },
      orderBy: [{ issueDate: "desc" }],
      take: 100
    });

    return ok({ records });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("attendance:create");
    const body = attendanceIssueCreateSchema.parse(await request.json());
    if (!canAccessDepartment(user, body.departmentId) && user.userLevel !== "LEVEL_1") {
      throw new HttpError(403, "You cannot create attendance records for that department.", "department_scope_denied");
    }

    const created = await prisma.attendanceIssueRecord.create({
      data: {
        organizationId: user.organizationId,
        recordNumber: recordNumber("ATT"),
        employeeProfileId: body.employeeProfileId,
        departmentId: body.departmentId,
        managerId: body.managerId,
        issueType: body.issueType,
        issueDate: new Date(body.issueDate),
        shiftId: body.shiftId,
        description: body.description,
        correctionNeeded: body.correctionNeeded,
        payrollImpact: body.payrollImpact,
        notes: body.notes,
        status: "Submitted",
        ownerId: body.managerId,
        createdById: user.id,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "attendance_issue.create",
      entityType: "attendance_issue_record",
      entityId: created.id,
      departmentId: created.departmentId,
      ownerId: created.ownerId,
      after: created
    });

    return ok({ record: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
