import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TrainingRecordsPage({
  searchParams
}: {
  searchParams: { status?: string; q?: string };
}) {
  const user = await requirePermission("quiz:insights");
  const status = searchParams.status ?? "ALL";
  const q = searchParams.q?.trim() ?? "";

  const scope = user.userLevel === "ADMIN" ? {} : departmentScopeForUser(user);
  const where: Record<string, unknown> = {
    organizationId: user.organizationId,
    archivedAt: null,
    ...scope
  };
  if (status !== "ALL") {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { participantName: { contains: q, mode: "insensitive" } },
      { participantEmployeeId: { contains: q, mode: "insensitive" } },
      { certificateNumber: { contains: q, mode: "insensitive" } }
    ];
  }

  const attempts = await prisma.quizAttempt.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500
  });

  const quizzes = attempts.length
    ? await prisma.quizDefinition.findMany({
        where: { organizationId: user.organizationId, id: { in: attempts.map((a) => a.quizId) } }
      })
    : [];
  const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Training · Records</p>
          <h1>Quiz records</h1>
          <p className="subhead">Database-of-record for every attempt. Filter by status or search by name / employee ID / certificate.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="button" href="/api/training/records.csv">Export CSV</a>
        </div>
      </div>

      <form className="card card-pad" style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
        <label>
          <strong>Status</strong>
          <select name="status" defaultValue={status}>
            {["ALL", "IN_PROGRESS", "PASSED", "FAILED", "ABANDONED", "EXPIRED"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1 }}>
          <strong>Search</strong>
          <input type="text" name="q" defaultValue={q} placeholder="Name / employee ID / certificate" />
        </label>
        <button type="submit" className="button primary">
          Apply
        </button>
      </form>

      <div className="card card-pad">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quiz</th>
              <th>Participant</th>
              <th>Department</th>
              <th>Status</th>
              <th>Score</th>
              <th>Certificate</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => {
              const quiz = quizMap.get(a.quizId);
              return (
                <tr key={a.id}>
                  <td>{quiz?.title ?? a.quizId}</td>
                  <td>
                    <strong>{a.participantName}</strong>
                    {a.participantEmployeeId ? <div className="metric-note">{a.participantEmployeeId}</div> : null}
                  </td>
                  <td>{a.participantDepartmentId ?? "—"}</td>
                  <td>
                    <span className={`pill ${a.status === "PASSED" ? "green" : a.status === "FAILED" ? "red" : "amber"}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>{a.scorePercent === null ? "—" : `${a.scorePercent}%`}</td>
                  <td>{a.certificateNumber ?? "—"}</td>
                  <td>{a.completedAt ? new Date(a.completedAt).toLocaleString() : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {attempts.length === 0 ? <p className="metric-note">No attempts match this view.</p> : null}
      </div>
    </>
  );
}
