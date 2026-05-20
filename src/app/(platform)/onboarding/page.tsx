import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OnboardingCasesPage() {
  const user = await requirePermission("onboarding:view");
  const cases = await prisma.onboardingCase.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      ...(user.userLevel === "MANAGER" ? { departmentId: user.departmentId ?? "__none__" } : {})
    },
    orderBy: [{ startDate: "asc" }],
    take: 100
  });

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Onboarding Center</p>
          <h1>Onboarding Cases</h1>
          <p className="subhead">Readiness, setup handoffs, training, acknowledgments, milestones, blockers, approvals, and timeline.</p>
        </div>
        <Link className="button primary" href="/workflows/onboarding-request-center">Create Onboarding Request</Link>
      </div>
      <section className="card">
        <div className="section-title">
          <h2>Active Case Queue</h2>
          <span className="pill">{cases.length}</span>
        </div>
        {cases.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Employee</th>
                <th>Status</th>
                <th>Readiness</th>
                <th>Start Date</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td><Link className="link" href={`/onboarding/${item.id}`}>{item.caseNumber}</Link></td>
                  <td>{item.firstName} {item.lastName}</td>
                  <td>{item.status}</td>
                  <td><span className="pill green">{item.readinessScore}%</span></td>
                  <td>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(item.startDate)}</td>
                  <td>{item.ownerId ?? "Unassigned"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No onboarding cases are active in your scope.</div>
        )}
      </section>
    </>
  );
}
