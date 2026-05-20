import { canAccessDepartment, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { recordNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";
import { ticketCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("ticket:view");
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    if (departmentId && !canAccessDepartment(user, departmentId)) {
      throw new HttpError(403, "You do not have access to this department ticket center.", "department_scope_denied");
    }

    const scope =
      user.userLevel === "LEVEL_1"
        ? { OR: [{ requestedById: user.id }, { requestedForId: user.id }] }
        : user.userLevel === "MANAGER"
          ? { departmentId: user.departmentId ?? "__none__" }
          : {};

    const tickets = await prisma.ticket.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(departmentId ? { departmentId } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority: priority as never } : {}),
        ...scope
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
      take: 100
    });

    return ok({ tickets });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("ticket:create");
    const body = ticketCreateSchema.parse(await request.json());

    if (!canAccessDepartment(user, body.departmentId) && user.userLevel !== "LEVEL_1") {
      throw new HttpError(403, "You cannot create tickets for that department.", "department_scope_denied");
    }

    const created = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          organizationId: user.organizationId,
          ticketNumber: recordNumber("TKT"),
          departmentId: body.departmentId,
          ticketCenterId: body.ticketCenterId,
          categoryId: body.categoryId,
          title: body.title,
          description: body.description,
          requestedById: user.id,
          requestedForId: body.requestedForId,
          assignedManagerId: body.assignedManagerId,
          assignedOwnerId: body.assignedOwnerId,
          priority: body.priority,
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
          locationId: body.locationId,
          shiftId: body.shiftId,
          relatedEmployeeId: body.relatedEmployeeId,
          relatedOnboardingCaseId: body.relatedOnboardingCaseId,
          relatedPayrollRequestId: body.relatedPayrollRequestId,
          ownerId: body.assignedOwnerId ?? body.assignedManagerId,
          createdById: user.id,
          updatedById: user.id
        }
      });

      await tx.ticketStatusHistory.create({
        data: {
          organizationId: user.organizationId,
          ticketId: ticket.id,
          toStatus: ticket.status,
          changedById: user.id,
          departmentId: ticket.departmentId,
          ownerId: ticket.ownerId,
          createdById: user.id
        }
      });

      return ticket;
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "ticket.create",
      entityType: "ticket",
      entityId: created.id,
      departmentId: created.departmentId,
      ownerId: created.ownerId,
      after: created
    });

    return ok({ ticket: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
