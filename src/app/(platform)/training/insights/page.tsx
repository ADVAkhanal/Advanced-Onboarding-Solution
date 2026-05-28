import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TrainingInsightsPage() {
  const user = await requirePermission("quiz:insights");
  const scope = user.userLevel === "ADMIN" ? {} : departmentScopeForUser(user);

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [attempts, quizzes, departments] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, completedAt: { gte: since }, ...scope }
    }),
    prisma.quizDefinition.findMany({
      where: { organizationId: user.organizationId, archivedAt: null }
    }),
    prisma.department.findMany({
      where: { organizationId: user.organizationId, archivedAt: null }
    })
  ]);

  const quizMap = new Map(quizzes.map((q) => [q.id, q]));
  const deptMap = new Map(departments.map((d) => [d.id, d]));

  const passed = attempts.filter((a) => a.status === "PASSED").length;
  const failed = attempts.filter((a) => a.status === "FAILED").length;
  const total = passed + failed;
  const passRate = total === 0 ? null : Math.round((passed / total) * 100);

  const byQuiz = new Map<string, { passed: number; failed: number; total: number }>();
  for (const a of attempts) {
    const bucket = byQuiz.get(a.quizId) ?? { passed: 0, failed: 0, total: 0 };
    if (a.status === "PASSED") bucket.passed += 1;
    else if (a.status === "FAILED") bucket.failed += 1;
    bucket.total += 1;
    byQuiz.set(a.quizId, bucket);
  }

  const byDept = new Map<string, { passed: number; failed: number; total: number }>();
  for (const a of attempts) {
    const key = a.participantDepartmentId ?? "_unassigned";
    const bucket = byDept.get(key) ?? { passed: 0, failed: 0, total: 0 };
    if (a.status === "PASSED") bucket.passed += 1;
    else if (a.status === "FAILED") bucket.failed += 1;
    bucket.total += 1;
    byDept.set(key, bucket);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Training · Insights</p>
          <h1>Manager insights</h1>
          <p className="subhead">Last 90 days of completed attempts, scoped to departments you manage.</p>
        </div>
      </div>

      <div className="grid four-col" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <p className="eyebrow">Completed attempts</p>
          <h2>{total}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Passed</p>
          <h2>{passed}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Failed</p>
          <h2>{failed}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Pass rate</p>
          <h2>{passRate === null ? "—" : `${passRate}%`}</h2>
        </div>
      </div>

      <div className="grid two-col">
        <div className="card card-pad">
          <h2 style={{ marginTop: 0 }}>By quiz</h2>
          {byQuiz.size === 0 ? (
            <p className="metric-note">No completed attempts yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quiz</th>
                  <th>Passed</th>
                  <th>Failed</th>
                  <th>Pass rate</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(byQuiz.entries()).map(([quizId, bucket]) => {
                  const quiz = quizMap.get(quizId);
                  const rate = bucket.total === 0 ? "—" : `${Math.round((bucket.passed / bucket.total) * 100)}%`;
                  return (
                    <tr key={quizId}>
                      <td>{quiz?.title ?? quizId}</td>
                      <td>{bucket.passed}</td>
                      <td>{bucket.failed}</td>
                      <td>{rate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card card-pad">
          <h2 style={{ marginTop: 0 }}>By department</h2>
          {byDept.size === 0 ? (
            <p className="metric-note">No completed attempts yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Passed</th>
                  <th>Failed</th>
                  <th>Pass rate</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(byDept.entries()).map(([deptId, bucket]) => {
                  const rate = bucket.total === 0 ? "—" : `${Math.round((bucket.passed / bucket.total) * 100)}%`;
                  const dept = deptMap.get(deptId);
                  return (
                    <tr key={deptId}>
                      <td>{deptId === "_unassigned" ? "Unassigned" : dept?.name ?? deptId}</td>
                      <td>{bucket.passed}</td>
                      <td>{bucket.failed}</td>
                      <td>{rate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
