import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { generateCertificateNumber } from "@/lib/training";

export const dynamic = "force-dynamic";

const startSchema = z.object({
  shareToken: z.string().trim().min(4).max(40),
  participantName: z.string().trim().min(1).max(160),
  participantEmployeeId: z.string().trim().max(80).optional(),
  participantDepartmentId: z.string().trim().min(1).optional(),
  participantManagerId: z.string().trim().min(1).optional()
});

const submitSchema = z.object({
  attemptId: z.string().trim().min(1),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1),
        selectedOptionId: z.string().trim().min(1).optional(),
        freeTextAnswer: z.string().trim().max(2000).optional()
      })
    )
    .min(1)
    .max(200)
});

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = startSchema.parse(raw);

    const link = await prisma.quizShareLink.findFirst({
      where: { token: body.shareToken, active: true, archivedAt: null }
    });
    if (!link) {
      throw new HttpError(404, "Share link is not active.", "share_link_not_found");
    }
    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new HttpError(410, "Share link has expired.", "share_link_expired");
    }

    const quiz = await prisma.quizDefinition.findFirst({
      where: { id: link.quizId, organizationId: link.organizationId, archivedAt: null }
    });
    if (!quiz || quiz.status !== "PUBLISHED") {
      throw new HttpError(409, "Quiz is not available.", "quiz_not_available");
    }

    const candidateQuestions = await prisma.quizQuestion.findMany({
      where: {
        organizationId: link.organizationId,
        active: true,
        archivedAt: null,
        ...(quiz.departmentId ? { OR: [{ departmentId: quiz.departmentId }, { departmentId: null }] } : {}),
        ...(quiz.categoryId ? { categoryId: quiz.categoryId } : {})
      },
      take: 500
    });

    if (candidateQuestions.length === 0) {
      throw new HttpError(409, "Quiz has no questions yet.", "quiz_empty");
    }

    const shuffled = quiz.pickStrategy === "sequential"
      ? candidateQuestions
      : [...candidateQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(quiz.questionCount, shuffled.length));
    const options = await prisma.quizQuestionOption.findMany({
      where: { organizationId: link.organizationId, questionId: { in: selected.map((q) => q.id) }, archivedAt: null },
      orderBy: { sortOrder: "asc" }
    });

    const sessionUser = await getCurrentUser();

    const attempt = await prisma.quizAttempt.create({
      data: {
        organizationId: link.organizationId,
        quizId: quiz.id,
        shareLinkId: link.id,
        participantUserId: sessionUser?.id,
        participantName: body.participantName,
        participantEmployeeId: body.participantEmployeeId,
        participantDepartmentId: body.participantDepartmentId ?? sessionUser?.departmentId ?? undefined,
        participantManagerId: body.participantManagerId ?? sessionUser?.managerId ?? undefined,
        status: "IN_PROGRESS",
        totalCount: selected.length,
        departmentId: quiz.departmentId ?? body.participantDepartmentId ?? undefined,
        ownerId: link.createdByUserId,
        createdById: sessionUser?.id,
        updatedById: sessionUser?.id
      }
    });

    await prisma.quizShareLink.update({
      where: { id: link.id },
      data: { usageCount: { increment: 1 } }
    });

    return ok(
      {
        attemptId: attempt.id,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          passThreshold: quiz.passThreshold,
          timeLimitMins: quiz.timeLimitMins
        },
        questions: selected.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          difficulty: q.difficulty,
          safetyCritical: q.safetyCritical,
          qualityCritical: q.qualityCritical,
          options: options
            .filter((o) => o.questionId === q.id)
            .map((o) => ({ id: o.id, label: o.label, sortOrder: o.sortOrder }))
        }))
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = submitSchema.parse(raw);

    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: body.attemptId, archivedAt: null }
    });
    if (!attempt) {
      throw new HttpError(404, "Attempt not found.", "not_found");
    }
    if (attempt.status !== "IN_PROGRESS") {
      throw new HttpError(409, "This attempt has already been scored.", "already_scored");
    }

    const quiz = await prisma.quizDefinition.findFirst({
      where: { id: attempt.quizId, organizationId: attempt.organizationId }
    });
    if (!quiz) {
      throw new HttpError(409, "Quiz no longer exists.", "quiz_missing");
    }

    const questionIds = body.answers.map((a) => a.questionId);
    const options = await prisma.quizQuestionOption.findMany({
      where: { organizationId: attempt.organizationId, questionId: { in: questionIds } }
    });
    const optionsByQuestion = new Map<string, typeof options>();
    for (const option of options) {
      const list = optionsByQuestion.get(option.questionId) ?? [];
      list.push(option);
      optionsByQuestion.set(option.questionId, list);
    }

    let correctCount = 0;
    const answerRows = body.answers.map((answer) => {
      const qOptions = optionsByQuestion.get(answer.questionId) ?? [];
      const correctIds = qOptions.filter((o) => o.isCorrect).map((o) => o.id);
      const correct = Boolean(answer.selectedOptionId && correctIds.includes(answer.selectedOptionId));
      if (correct) correctCount += 1;
      return {
        organizationId: attempt.organizationId,
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        freeTextAnswer: answer.freeTextAnswer,
        correct,
        departmentId: attempt.departmentId,
        ownerId: attempt.ownerId,
        createdById: attempt.createdById,
        updatedById: attempt.createdById
      };
    });

    const scorePercent = answerRows.length === 0 ? 0 : Math.round((correctCount / answerRows.length) * 100);
    const passed = scorePercent >= quiz.passThreshold;
    const certificateNumber = passed ? generateCertificateNumber() : null;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.quizAttemptAnswer.createMany({ data: answerRows });
      return tx.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          status: passed ? "PASSED" : "FAILED",
          scorePercent,
          correctCount,
          totalCount: answerRows.length,
          completedAt: new Date(),
          certificateNumber: certificateNumber ?? undefined,
          updatedById: attempt.createdById
        }
      });
    });

    await recordAudit({
      organizationId: attempt.organizationId,
      actorId: attempt.createdById,
      action: "quiz_attempt.complete",
      entityType: "quiz_attempt",
      entityId: attempt.id,
      departmentId: attempt.departmentId,
      ownerId: attempt.ownerId,
      after: { status: updated.status, scorePercent, correctCount, total: answerRows.length }
    });

    return ok({
      attempt: {
        id: updated.id,
        status: updated.status,
        scorePercent: updated.scorePercent,
        correctCount,
        totalCount: answerRows.length,
        passed,
        certificateNumber: updated.certificateNumber
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
