import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PayrollCoordinationPage() {
  const user = await requirePermission("payroll:view");
  const [requests, periods] = await Promise.all([
    prisma.payrollChangeRequest.findMany({
      where: { organizationId: user.organizationId, archivedAt: null, ...(user.userLevel === "MANAGER" ? { departmentId: user.departmentId ?? "__none__" } : {}) },
      orderBy: [{ updatedAt: "desc" }],
      take: 100
    }),
    prisma.payrollPeriod.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { startDate: "desc" }, take: 6 })
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Payroll Coordination Center</p>
          <h1>Payroll Requests & Period Readiness</h1>
          <p className="subhead">Coordination-only records for review, approval, safe export, and external payroll entry confirmation.</p>
        </div>
        <Link className="button primary" href="/workflows/payroll-coordination-center">Create Payroll Request</Link>
      </div>

      <div className="grid two-col">
        <section className="card">
          <div className="section-title"><h2>Payroll Period Checklist</h2><span className="pill green">No banking or tax data</span></div>
          <div className="card-pad">
            {periods.length ? (
              <ul className="compact-list">
                {periods.map((period) => (
                  <li key={period.id}>
                    <span>{period.label}</span>
                    <strong>{period.readinessScore}% · {period.status}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty">No payroll periods have been configured yet.</div>
            )}
          </div>
        </section>
        <section className="card">
          <div className="section-title"><h2>Safety Rules</h2><span className="pill green">Enforced</span></div>
          <div className="card-pad">
            <ul className="compact-list">
              <li><span>Managers request changes</span><strong>Yes</strong></li>
              <li><span>Directors approve higher-level changes</span><strong>Yes</strong></li>
              <li><span>Payroll/Admin marks exported</span><strong>Yes</strong></li>
              <li><span>Payroll taxes calculated here</span><strong>No</strong></li>
            </ul>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>Payroll Change Requests</h2><span className="pill">{requests.length}</span></div>
        {requests.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Export</th>
                <th>Effective</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.requestNumber}</td>
                  <td>{request.requestType}</td>
                  <td>{request.status}</td>
                  <td>{request.exportStatus}</td>
                  <td>{request.effectiveDate ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(request.effectiveDate) : "Not set"}</td>
                  <td>{request.businessReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No payroll coordination requests are currently open in your scope.</div>
        )}
      </section>
    </>
  );
}
