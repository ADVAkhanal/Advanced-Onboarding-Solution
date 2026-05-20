import { canAccessDepartment, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ticketUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("ticket:view");
    const ticket = await prisma.ticket.findFirst({
      where: { id: context.params.id, organizationId: user.organizationId, archivedAt: null }
    });

    if (!ticket) {
      throw new HttpError(404, "Ticket not found.", "not_found");
    }

    const ownsTicket = ticket.requestedById === user.id || ticket.requestedForId === user.id;
    if (user.userLevel === "USER" && !ownsTicket) {
      throw new HttpError(403, "You can only view your own tickets.", "forbidden");
    }
    if (user.userLevel !== "USER" && !canAccessDepartment(user, ticket.departmentId)) {
      throw new HttpError(403, "You do not have access to that department.", "department_scope_denied");
    }

    const [comments, statusHistory] = await Promise.all([
      prisma.ticketComment.findMany({ where: { organizationId: user.organizationId, ticketId: ticket.id, archivedAt: null }, orderBy: { createdAt: "asc" } }),
      prisma.ticketStatusHistory.findMany({ where: { organizationId: user.organizationId, ticketId: ticket.id, archivedAt: null }, orderBy: { createdAt: "desc" } })
    ]);

    return ok({ ticket, comments, statusHistory });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("ticket:manage");
    const body = ticketUpdateSchema.parse(await request.json());
    const ticket = await prisma.ticket.findFirst({
      where: { id: context.params.id, organizationId: user.organizationId, archivedAt: null }
    });

    if (!ticket) {
      throw new HttpError(404, "Ticket not found.", "not_found");
    }
    if (!canAccessDepartment(user, ticket.departmentId)) {
      throw new HttpError(403, "You do not have access to that department.", "department_scope_denied");
    }

    const nextStatus = body.reopen ? "Reopened" : body.status;
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: nextStatus ?? ticket.status,
          priority: body.priority ?? undefined,
          assignedOwnerId: body.assignedOwnerId === null ? null : body.assignedOwnerId ?? undefined,
          ownerId: body.assignedOwnerId === null ? null : body.assignedOwnerId ?? undefined,
          dueDate: body.dueDate === null ? null : body.dueDate ? new Date(body.dueDate) : undefined,
          resolutionNotes: body.resolutionNotes === null ? null : body.resolutionNotes ?? undefined,
          closedById: nextStatus === "Closed" || nextStatus === "Resolved" ? user.id : undefined,
          closedAt: nextStatus === "Closed" || nextStatus === "Resolved" ? new Date() : undefined,
          reopenedCount: body.reopen ? { increment: 1 } : undefined,
          updatedById: user.id
        }
      });

      if (nextStatus && nextStatus !== ticket.status) {
        await tx.ticketStatusHistory.create({
          data: {
            organizationId: user.organizationId,
            ticketId: ticket.id,
            fromStatus: ticket.status,
            toStatus: nextStatus,
            changedById: user.id,
            departmentId: ticket.departmentId,
            ownerId: result.ownerId,
            createdById: user.id
          }
        });
      }

      return result;
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: body.reopen ? "ticket.reopen" : "ticket.update",
      entityType: "ticket",
      entityId: ticket.id,
      departmentId: ticket.departmentId,
      ownerId: updated.ownerId,
      before: ticket,
      after: updated
    });

    return ok({ ticket: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
