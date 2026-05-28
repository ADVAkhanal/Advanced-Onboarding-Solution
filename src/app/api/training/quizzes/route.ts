import { z } from "zod";
import { requirePermission, canAccessDepartment, departmentScopeForUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const quizCreateSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9-]+$/i),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional(),
  departmentId: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  questionCount: z.coerce.number().int().min(1).max(100).default(10),
  pickStrategy: z.enum(["random", "random_balanced", "sequential"]).default("random_balanced"),
  passThreshold: z.coerce.number().int().min(40).max(100).default(80),
  timeLimitMins: z.coerce.number().int().min(1).max(180).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT")
});

export async function GET(request: Request) {
  try {
    const user = await requirePermission("quiz:launch");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const departmentId = searchParams.get("departmentId");

    const scope = user.userLevel === "ADMIN" ? {} : departmentScopeForUser(user);

    const quizzes = await prisma.quizDefinition.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...scope,
        ...(status ? { status: status as never } : {}),
        ...(departmentId ? { departmentId } : {})
      },
      orderBy: { updatedAt: "desc" },
      take: 200
    });

    return ok({ quizzes });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("quiz:author");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = quizCreateSchema.parse(raw);

    if (body.departmentId && !canAccessDepartment(user, body.departmentId)) {
      throw new HttpError(403, "You cannot create quizzes for this department.", "department_scope_denied");
    }

    const quiz = await prisma.quizDefinition.create({
      data: {
        organizationId: user.organizationId,
        slug: body.slug,
        title: body.title,
        description: body.description,
        departmentId: body.departmentId,
        categoryId: body.categoryId,
        status: body.status,
        questionCount: body.questionCount,
        pickStrategy: body.pickStrategy,
        passThreshold: body.passThreshold,
        timeLimitMins: body.timeLimitMins,
        ownerId: user.id,
        createdById: user.id,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "quiz.create",
      entityType: "quiz_definition",
      entityId: quiz.id,
      departmentId: quiz.departmentId,
      ownerId: quiz.ownerId,
      after: { slug: quiz.slug, title: quiz.title, status: quiz.status }
    });

    return ok({ quiz }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
