import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { REPORT_TYPES } from "@/lib/reference-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requirePermission("report:view");
  const reports = await prisma.report.findMany({
    where: { organizationId: user.organizationId, archivedAt: null, ...(user.userLevel === "MANAGER" ? { departmentId: user.departmentId ?? "__none__" } : {}) },
    orderBy: { generatedAt: "desc" },
    take: 50
  });

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Reports & Exports</p>
          <h1>Management Reports</h1>
          <p className="subhead">Branded internal-use reporting for management, onboarding, payroll coordination, department tickets, and productivity.</p>
        </div>
        <Link className="button primary" href="/workflows/reports-exports">Generate Report</Link>
      </div>

      <section className="card">
        <div className="section-title"><h2>Available Report Templates</h2><span className="pill">{REPORT_TYPES.length}</span></div>
        <div className="card-pad field-grid">
          {REPORT_TYPES.map((type) => (
            <span className="field-chip" key={type}>{type}</span>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>Generated Reports</h2><span className="pill">{reports.length}</span></div>
        {reports.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Generated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.reportNumber}</td>
                  <td>{report.title}</td>
                  <td>{report.reportType}</td>
                  <td>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(report.generatedAt)}</td>
                  <td>{report.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No reports have been generated in your scope.</div>
        )}
      </section>
    </>
  );
}
