import { z } from "zod";
import { requirePermission, canAccessDepartment, departmentScopeForUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, ok, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { generateShareToken } from "@/lib/training";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  quizId: z.string().trim().min(1),
  label: z.string().trim().max(160).optional(),
  expiresAt: z.string().datetime().optional()
});

export async function GET(request: Request) {
  try {
    const user = await requirePermission("quiz:launch");
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId");
    const scope = user.userLevel === "ADMIN" ? {} : departmentScopeForUser(user);

    const links = await prisma.quizShareLink.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...scope,
        ...(quizId ? { quizId } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return ok({ links });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("quiz:launch");
    const body = createSchema.parse(await request.json());

    const quiz = await prisma.quizDefinition.findFirst({
      where: { id: body.quizId, organizationId: user.organizationId, archivedAt: null }
    });
    if (!quiz) {
      throw new HttpError(404, "Quiz not found.", "not_found");
    }
    if (quiz.status !== "PUBLISHED") {
      throw new HttpError(409, "Only published quizzes can be shared.", "quiz_not_published");
    }
    if (quiz.departmentId && !canAccessDepartment(user, quiz.departmentId)) {
      throw new HttpError(403, "You cannot share quizzes in this department.", "department_scope_denied");
    }

    let token = generateShareToken(10);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await prisma.quizShareLink.findFirst({
        where: { organizationId: user.organizationId, token }
      });
      if (!existing) break;
      token = generateShareToken(10);
    }

    const link = await prisma.quizShareLink.create({
      data: {
        organizationId: user.organizationId,
        quizId: quiz.id,
        token,
        label: body.label,
        createdByUserId: user.id,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        departmentId: quiz.departmentId,
        ownerId: user.id,
        createdById: user.id,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "quiz_share_link.create",
      entityType: "quiz_share_link",
      entityId: link.id,
      departmentId: link.departmentId,
      ownerId: link.ownerId,
      after: { token: link.token, quizId: quiz.id, expiresAt: link.expiresAt }
    });

    return ok({ link }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
