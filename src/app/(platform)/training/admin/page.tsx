import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrainingAdminClient } from "./admin-client";

export const dynamic = "force-dynamic";

export default async function TrainingAdminPage() {
  const user = await requirePermission("quiz:author");
  const scope = user.userLevel === "ADMIN" ? {} : departmentScopeForUser(user);

  const [quizzes, questions, categories, departments, links] = await Promise.all([
    prisma.quizDefinition.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, ...scope },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.quizQuestion.count({
      where: { organizationId: user.organizationId, active: true, archivedAt: null, ...scope }
    }),
    prisma.questionBankCategory.findMany({
      where: { organizationId: user.organizationId, archivedAt: null }
    }),
    prisma.department.findMany({
      where: { organizationId: user.organizationId, archivedAt: null }
    }),
    prisma.quizShareLink.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, ...scope },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Training · Admin</p>
          <h1>Quiz administration</h1>
          <p className="subhead">
            Author quizzes and questions, publish, share by link, and monitor share usage. Manager-controlled, audit logged.
          </p>
        </div>
      </div>

      <TrainingAdminClient
        quizzes={quizzes.map((q) => ({
          id: q.id,
          slug: q.slug,
          title: q.title,
          description: q.description,
          departmentId: q.departmentId,
          categoryId: q.categoryId,
          status: q.status,
          questionCount: q.questionCount,
          passThreshold: q.passThreshold
        }))}
        bankSize={questions}
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        departments={departments.map((d) => ({ id: d.id, name: d.name, code: d.code }))}
        links={links.map((l) => ({
          id: l.id,
          token: l.token,
          quizId: l.quizId,
          label: l.label,
          usageCount: l.usageCount,
          expiresAt: l.expiresAt?.toISOString() ?? null,
          active: l.active
        }))}
      />
    </>
  );
}
