import { requirePermission, departmentScopeForUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("sop:escalation:resolve");
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") ?? "open";

    const scope = user.userLevel === "ADMIN" ? {} : departmentScopeForUser(user);

    const where: Record<string, unknown> = {
      organizationId: user.organizationId,
      archivedAt: null,
      ...scope
    };
    if (tab === "open") {
      where.status = { in: ["OPEN", "ASSIGNED"] };
    } else if (tab === "mine") {
      where.routedToUserId = user.id;
      where.status = { in: ["OPEN", "ASSIGNED"] };
    } else if (tab === "closed") {
      where.status = { in: ["RESOLVED_ANSWERED", "RESOLVED_SOP_DRAFTED", "RESOLVED_NO_ACTION"] };
    }

    const escalations = await prisma.sopEscalation.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200
    });

    const queryIds = escalations.map((e) => e.queryId);
    const queries = queryIds.length
      ? await prisma.sopQuery.findMany({
          where: { organizationId: user.organizationId, id: { in: queryIds } }
        })
      : [];

    return ok({ escalations, queries });
  } catch (error) {
    return handleRouteError(error);
  }
}
