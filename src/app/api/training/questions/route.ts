import { z } from "zod";
import { requirePermission, canAccessDepartment, departmentScopeForUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const questionCreateSchema = z.object({
  prompt: z.string().trim().min(5).max(2000),
  explanation: z.string().trim().max(2000).optional(),
  difficulty: z.enum(["easy", "normal", "hard"]).default("normal"),
  categoryId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  safetyCritical: z.boolean().default(false),
  qualityCritical: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  options: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(400),
        isCorrect: z.boolean().default(false),
        sortOrder: z.coerce.number().int().min(0).max(20).optional()
      })
    )
    .min(2)
    .max(8)
});

export async function GET(request: Request) {
  try {
    const user = await requirePermission("quiz:author");
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId");
    const categoryId = searchParams.get("categoryId");

    const scope = user.userLevel === "ADMIN" ? {} : departmentScopeForUser(user);

    const questions = await prisma.quizQuestion.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        active: true,
        ...scope,
        ...(departmentId ? { departmentId } : {}),
        ...(categoryId ? { categoryId } : {})
      },
      orderBy: { updatedAt: "desc" },
      take: 500
    });
    const options = questions.length
      ? await prisma.quizQuestionOption.findMany({
          where: { organizationId: user.organizationId, questionId: { in: questions.map((q) => q.id) }, archivedAt: null },
          orderBy: { sortOrder: "asc" }
        })
      : [];

    return ok({ questions, options });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("quiz:author");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = questionCreateSchema.parse(raw);

    if (body.departmentId && !canAccessDepartment(user, body.departmentId)) {
      throw new HttpError(403, "You cannot create questions for this department.", "department_scope_denied");
    }
    if (!body.options.some((option) => option.isCorrect)) {
      throw new HttpError(422, "At least one option must be marked correct.", "no_correct_option");
    }

    const created = await prisma.$transaction(async (tx) => {
      const question = await tx.quizQuestion.create({
        data: {
          organizationId: user.organizationId,
          prompt: body.prompt,
          explanation: body.explanation,
          difficulty: body.difficulty,
          categoryId: body.categoryId,
          departmentId: body.departmentId,
          safetyCritical: body.safetyCritical,
          qualityCritical: body.qualityCritical,
          tags: body.tags ? JSON.parse(JSON.stringify(body.tags)) : undefined,
          ownerId: user.id,
          createdById: user.id,
          updatedById: user.id
        }
      });
      await tx.quizQuestionOption.createMany({
        data: body.options.map((option, index) => ({
          organizationId: user.organizationId,
          questionId: question.id,
          label: option.label,
          isCorrect: option.isCorrect,
          sortOrder: option.sortOrder ?? index,
          departmentId: body.departmentId,
          ownerId: user.id,
          createdById: user.id,
          updatedById: user.id
        }))
      });
      return question;
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "quiz_question.create",
      entityType: "quiz_question",
      entityId: created.id,
      departmentId: created.departmentId,
      ownerId: created.ownerId,
      after: { difficulty: created.difficulty, safetyCritical: created.safetyCritical }
    });

    return ok({ question: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
