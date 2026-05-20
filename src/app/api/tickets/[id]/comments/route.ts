import { canAccessDepartment, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ticketCommentSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("ticket:view");
    const body = ticketCommentSchema.parse(await request.json());
    const ticket = await prisma.ticket.findFirst({
      where: { id: context.params.id, organizationId: user.organizationId, archivedAt: null }
    });

    if (!ticket) {
      throw new HttpError(404, "Ticket not found.", "not_found");
    }

    const ownsTicket = ticket.requestedById === user.id || ticket.requestedForId === user.id;
    if (user.userLevel === "USER" && !ownsTicket) {
      throw new HttpError(403, "You can only comment on your own tickets.", "forbidden");
    }
    if (user.userLevel !== "USER" && !canAccessDepartment(user, ticket.departmentId)) {
      throw new HttpError(403, "You do not have access to that department.", "department_scope_denied");
    }

    const comment = await prisma.ticketComment.create({
      data: {
        organizationId: user.organizationId,
        ticketId: ticket.id,
        body: body.body,
        authorId: user.id,
        departmentId: ticket.departmentId,
        ownerId: ticket.ownerId,
        createdById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "ticket.comment",
      entityType: "ticket",
      entityId: ticket.id,
      departmentId: ticket.departmentId,
      ownerId: ticket.ownerId,
      after: { commentId: comment.id }
    });

    return ok({ comment }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
