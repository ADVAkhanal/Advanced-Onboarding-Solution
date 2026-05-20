import { canAccessDepartment, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { taskCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePermission("task:view");
    const scope =
      user.userLevel === "USER"
        ? { ownerId: user.id }
        : user.userLevel === "MANAGER"
          ? { departmentId: user.departmentId ?? "__none__" }
          : {};

    const tasks = await prisma.productivityTask.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, ...scope },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 100
    });

    return ok({ tasks });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("task:create");
    const body = taskCreateSchema.parse(await request.json());
    if (body.departmentId && !canAccessDepartment(user, body.departmentId)) {
      throw new HttpError(403, "You cannot create tasks for that department.", "department_scope_denied");
    }

    const task = await prisma.productivityTask.create({
      data: {
        organizationId: user.organizationId,
        title: body.title,
        description: body.description,
        departmentId: body.departmentId ?? user.departmentId ?? "",
        ownerId: body.ownerId ?? user.id,
        assignedById: user.id,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        linkedTicketId: body.linkedTicketId,
        linkedOnboardingCaseId: body.linkedOnboardingCaseId,
        linkedPayrollRequestId: body.linkedPayrollRequestId,
        status: "Not Started",
        createdById: user.id,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "task.create",
      entityType: "productivity_task",
      entityId: task.id,
      departmentId: task.departmentId,
      ownerId: task.ownerId,
      after: task
    });

    return ok({ task }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
