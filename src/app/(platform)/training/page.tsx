import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getManagerTrainingDashboard } from "@/lib/training";

export const dynamic = "force-dynamic";

export default async function TrainingHubPage() {
  const user = await requirePermission("quiz:take");

  if (!user.permissions.includes("quiz:launch")) {
    // Level 1 portal: show "your training" list of attempts.
    return (
      <>
        <div className="page-head">
          <div>
            <p className="eyebrow">Training</p>
            <h1>Your training assignments</h1>
            <p className="subhead">Quizzes shared with you appear here. Open the link your manager sent to take one.</p>
          </div>
        </div>
        <div className="card card-pad">
          <p className="metric-note">
            Quizzes are launched by managers via share links. If you have a link, paste it into your browser or
            click it. Your completion is automatically recorded.
          </p>
        </div>
      </>
    );
  }

  const dashboard = await getManagerTrainingDashboard(user);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Training · Manager launcher</p>
          <h1>Quiz launcher</h1>
          <p className="subhead">
            Share quizzes with any participant by link. Manager-controlled, certified on pass, recorded as
            evidence of training.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="button" href="/training/records">Records</Link>
          <Link className="button" href="/training/insights">Insights</Link>
          <Link className="button" href="/training/bank">Question bank</Link>
          <Link className="button primary" href="/training/admin">Admin</Link>
        </div>
      </div>

      <div className="grid four-col" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <p className="eyebrow">Quizzes</p>
          <h2>{dashboard.quizzes.length}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Attempts</p>
          <h2>{dashboard.totalAttempts}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Passed</p>
          <h2>{dashboard.passed}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Pass rate</p>
          <h2>{dashboard.passRate === null ? "—" : `${dashboard.passRate}%`}</h2>
        </div>
      </div>

      <div className="card card-pad">
        <h2 style={{ marginTop: 0 }}>Your published quizzes</h2>
        {dashboard.quizzes.length === 0 ? (
          <p className="metric-note">
            No quizzes yet. Build one in the <Link href="/training/admin">Admin</Link> page and publish to launch.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Questions</th>
                <th>Pass %</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.quizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td>
                    <strong>{quiz.title}</strong>
                  </td>
                  <td>
                    <code>{quiz.slug}</code>
                  </td>
                  <td>
                    <span className={`pill ${quiz.status === "PUBLISHED" ? "green" : "amber"}`}>{quiz.status}</span>
                  </td>
                  <td>{quiz.questionCount}</td>
                  <td>{quiz.passThreshold}%</td>
                  <td>{new Date(quiz.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Recent attempts</h2>
        {dashboard.recent.length === 0 ? (
          <p className="metric-note">No attempts in your scope yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Status</th>
                <th>Score</th>
                <th>Certificate</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recent.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.participantName}</td>
                  <td>
                    <span className={`pill ${attempt.status === "PASSED" ? "green" : attempt.status === "FAILED" ? "red" : "amber"}`}>
                      {attempt.status}
                    </span>
                  </td>
                  <td>{attempt.scorePercent === null ? "—" : `${attempt.scorePercent}%`}</td>
                  <td>{attempt.certificateNumber ?? "—"}</td>
                  <td>
                    {attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : "in progress"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
