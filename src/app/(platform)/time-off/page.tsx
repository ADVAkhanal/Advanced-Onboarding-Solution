import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function TimeOffPage() {
  const user = await requirePermission("timeoff:view");
  const requests = await prisma.timeOffRequest.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      ...departmentScopeForUser(user),
      ...(user.userLevel === "USER" ? { createdById: user.id } : {})
    },
    orderBy: [{ startDate: "asc" }, { updatedAt: "desc" }],
    take: 100
  });

  const pending = requests.filter((request) => ["Submitted", "Manager Review", "Needs Coverage Plan"].includes(request.status)).length;
  const payrollNotes = requests.filter((request) => request.payrollNoteRequired && !request.exportedToPayroll).length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Time-Off Request Center</p>
          <h1>Coverage, approvals, and payroll handoff</h1>
          <p className="subhead">Coordinate PTO, unpaid time, partial days, late arrivals, early departures, coverage plans, and safe payroll notes.</p>
        </div>
      </div>

      <div className="grid three-col">
        <section className="card kpi"><div className="metric-label">Requests in scope</div><div className="metric-value">{requests.length}</div><div className="metric-note">Server-scoped by role and department</div></section>
        <section className="card kpi"><div className="metric-label">Awaiting review</div><div className="metric-value">{pending}</div><div className="metric-note">Manager or coverage decision required</div></section>
        <section className="card kpi"><div className="metric-label">Payroll notes</div><div className="metric-value">{payrollNotes}</div><div className="metric-note">Coordination only, no payroll processing</div></section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>Request Queue</h2><span className="pill">{requests.length}</span></div>
        {requests.length ? (
          <table className="table">
            <thead>
              <tr><th>Request ID</th><th>Type</th><th>Status</th><th>Dates</th><th>Coverage Plan</th><th>Payroll Note</th></tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.requestNumber}</td>
                  <td>{request.timeOffType}</td>
                  <td>{request.status}</td>
                  <td>{formatDate(request.startDate)} to {formatDate(request.endDate)}</td>
                  <td>{request.coveragePlan ?? "Not recorded"}</td>
                  <td>{request.payrollNoteRequired ? "Required" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No time-off requests are currently recorded in your scope.</div>
        )}
      </section>
    </>
  );
}
