import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function ApprovalsPage() {
  const user = await requirePermission("approval:view");
  const approvals = await prisma.approvalRequest.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      ...departmentScopeForUser(user)
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: 100
  });

  const pending = approvals.filter((approval) => approval.status === "Pending").length;
  const escalated = approvals.filter((approval) => approval.status === "Escalated" || approval.priority === "URGENT" || approval.priority === "WORK_STOPPAGE").length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Approval Queue</p>
          <h1>Approval decisions and escalation control</h1>
          <p className="subhead">Central queue for payroll, onboarding, time-off, resource, staffing, schedule exception, and task-completion approvals.</p>
        </div>
      </div>

      <div className="grid three-col">
        <section className="card kpi"><div className="metric-label">Approvals</div><div className="metric-value">{approvals.length}</div><div className="metric-note">Visible within role scope</div></section>
        <section className="card kpi"><div className="metric-label">Pending</div><div className="metric-value">{pending}</div><div className="metric-note">Awaiting authorized decision</div></section>
        <section className="card kpi"><div className="metric-label">Escalated or urgent</div><div className="metric-value">{escalated}</div><div className="metric-note">Needs leadership attention</div></section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>Decision Queue</h2><span className="pill green">Self-approval blocked</span></div>
        {approvals.length ? (
          <table className="table">
            <thead><tr><th>Approval ID</th><th>Type</th><th>Status</th><th>Priority</th><th>Due</th><th>Summary</th></tr></thead>
            <tbody>
              {approvals.map((approval) => (
                <tr key={approval.id}>
                  <td>{approval.requestNumber}</td>
                  <td>{approval.approvalType}</td>
                  <td>{approval.status}</td>
                  <td>{approval.priority.replaceAll("_", " ")}</td>
                  <td>{formatDate(approval.dueDate)}</td>
                  <td>{approval.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No approvals are currently waiting in your scope.</div>
        )}
      </section>
    </>
  );
}
