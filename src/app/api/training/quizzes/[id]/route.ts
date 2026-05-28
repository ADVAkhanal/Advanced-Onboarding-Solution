import { z } from "zod";
import { canAccessDepartment, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, ok, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  questionCount: z.coerce.number().int().min(1).max(100).optional(),
  passThreshold: z.coerce.number().int().min(40).max(100).optional(),
  timeLimitMins: z.coerce.number().int().min(1).max(180).optional().nullable()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("quiz:author");
    const body = updateSchema.parse(await request.json());

    const quiz = await prisma.quizDefinition.findFirst({
      where: { id: params.id, organizationId: user.organizationId, archivedAt: null }
    });
    if (!quiz) {
      throw new HttpError(404, "Quiz not found.", "not_found");
    }
    if (quiz.departmentId && !canAccessDepartment(user, quiz.departmentId)) {
      throw new HttpError(403, "You cannot manage quizzes in this department.", "department_scope_denied");
    }

    if (body.status === "PUBLISHED") {
      const haveQuestions = await prisma.quizQuestion.count({
        where: {
          organizationId: user.organizationId,
          active: true,
          archivedAt: null,
          ...(quiz.departmentId ? { OR: [{ departmentId: quiz.departmentId }, { departmentId: null }] } : {}),
          ...(quiz.categoryId ? { categoryId: quiz.categoryId } : {})
        }
      });
      if (haveQuestions === 0) {
        throw new HttpError(409, "Add at least one matching question to the bank before publishing.", "quiz_empty");
      }
    }

    const updated = await prisma.quizDefinition.update({
      where: { id: quiz.id },
      data: {
        title: body.title,
        description: body.description,
        questionCount: body.questionCount,
        passThreshold: body.passThreshold,
        timeLimitMins: body.timeLimitMins === null ? null : body.timeLimitMins,
        status: body.status,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "quiz.update",
      entityType: "quiz_definition",
      entityId: quiz.id,
      departmentId: quiz.departmentId,
      ownerId: quiz.ownerId,
      before: { status: quiz.status, title: quiz.title },
      after: { status: updated.status, title: updated.title }
    });

    return ok({ quiz: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
