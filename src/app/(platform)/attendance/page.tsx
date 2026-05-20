import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function AttendancePage() {
  const user = await requirePermission("attendance:view");
  const records = await prisma.attendanceIssueRecord.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      ...departmentScopeForUser(user),
      ...(user.userLevel === "USER" ? { createdById: user.id } : {})
    },
    orderBy: [{ issueDate: "desc" }],
    take: 100
  });

  const payrollImpact = records.filter((record) => record.payrollImpact).length;
  const managerReview = records.filter((record) => ["Submitted", "Manager Review"].includes(record.status)).length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Attendance & Schedule Issue Center</p>
          <h1>Attendance and schedule coordination</h1>
          <p className="subhead">Track missed punches, late arrivals, absences, schedule conflicts, shift swaps, overtime notes, and payroll handoffs without storing sensitive payroll data.</p>
        </div>
      </div>

      <div className="grid three-col">
        <section className="card kpi"><div className="metric-label">Issue records</div><div className="metric-value">{records.length}</div><div className="metric-note">Visible within role scope</div></section>
        <section className="card kpi"><div className="metric-label">Manager review</div><div className="metric-value">{managerReview}</div><div className="metric-note">Needs department owner action</div></section>
        <section className="card kpi"><div className="metric-label">Payroll impact</div><div className="metric-value">{payrollImpact}</div><div className="metric-note">Requires safe handoff only</div></section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>Issue Queue</h2><span className="pill">{records.length}</span></div>
        {records.length ? (
          <table className="table">
            <thead>
              <tr><th>Record ID</th><th>Issue</th><th>Date</th><th>Status</th><th>Payroll Impact</th><th>Description</th></tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.recordNumber}</td>
                  <td>{record.issueType}</td>
                  <td>{formatDate(record.issueDate)}</td>
                  <td>{record.status}</td>
                  <td>{record.payrollImpact ? "Yes" : "No"}</td>
                  <td>{record.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No attendance or schedule issues are currently recorded in your scope.</div>
        )}
      </section>
    </>
  );
}
