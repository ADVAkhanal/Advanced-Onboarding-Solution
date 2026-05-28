import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function QuestionBankPage() {
  const user = await requirePermission("quiz:author");
  const scope = user.userLevel === "ADMIN" ? {} : departmentScopeForUser(user);

  const [questions, categories, departments] = await Promise.all([
    prisma.quizQuestion.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, active: true, ...scope },
      orderBy: { updatedAt: "desc" },
      take: 500
    }),
    prisma.questionBankCategory.findMany({
      where: { organizationId: user.organizationId, archivedAt: null }
    }),
    prisma.department.findMany({
      where: { organizationId: user.organizationId, archivedAt: null }
    })
  ]);

  const optionRows = questions.length
    ? await prisma.quizQuestionOption.findMany({
        where: { organizationId: user.organizationId, questionId: { in: questions.map((q) => q.id) } },
        orderBy: { sortOrder: "asc" }
      })
    : [];
  const optionsByQuestion = new Map<string, typeof optionRows>();
  for (const option of optionRows) {
    const list = optionsByQuestion.get(option.questionId) ?? [];
    list.push(option);
    optionsByQuestion.set(option.questionId, list);
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const departmentMap = new Map(departments.map((d) => [d.id, d]));

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Training · Question bank</p>
          <h1>Question bank</h1>
          <p className="subhead">
            One library, many quizzes. Tag questions as safety- or quality-critical so reports can flag
            misses on those questions specifically.
          </p>
        </div>
      </div>

      <div className="grid four-col" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <p className="eyebrow">Questions</p>
          <h2>{questions.length}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Categories</p>
          <h2>{categories.length}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Safety-critical</p>
          <h2>{questions.filter((q) => q.safetyCritical).length}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Quality-critical</p>
          <h2>{questions.filter((q) => q.qualityCritical).length}</h2>
        </div>
      </div>

      <div className="card card-pad">
        {questions.length === 0 ? (
          <p className="metric-note">No questions in this scope yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Prompt</th>
                <th>Department</th>
                <th>Category</th>
                <th>Options</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const opts = optionsByQuestion.get(q.id) ?? [];
                return (
                  <tr key={q.id}>
                    <td>
                      <strong>{q.prompt}</strong>
                      {q.explanation ? <div className="metric-note">Explanation: {q.explanation}</div> : null}
                    </td>
                    <td>{q.departmentId ? departmentMap.get(q.departmentId)?.name ?? q.departmentId : "—"}</td>
                    <td>{q.categoryId ? categoryMap.get(q.categoryId)?.name ?? q.categoryId : "—"}</td>
                    <td>
                      <ul className="compact-list">
                        {opts.map((o) => (
                          <li key={o.id}>
                            {o.isCorrect ? <strong>✓ </strong> : null}
                            {o.label}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      {[
                        q.safetyCritical ? "SAFETY" : null,
                        q.qualityCritical ? "QUALITY" : null
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
