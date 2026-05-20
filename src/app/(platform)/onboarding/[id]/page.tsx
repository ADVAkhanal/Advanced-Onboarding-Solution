import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BadgeCheck, ClipboardCheck, FileText, Plus, UserPlus } from "lucide-react";
import { canAccessDepartment, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function dateLabel(value: Date | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(value);
}

export default async function OnboardingCaseDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission("onboarding:view");
  const onboardingCase = await prisma.onboardingCase.findFirst({
    where: { id: params.id, organizationId: user.organizationId, archivedAt: null }
  });

  if (!onboardingCase || !canAccessDepartment(user, onboardingCase.departmentId)) {
    notFound();
  }

  const [department, items, milestones, tickets, comments, documents, history, approvals, blockers] = await Promise.all([
    prisma.department.findFirst({ where: { id: onboardingCase.departmentId, organizationId: user.organizationId } }),
    prisma.onboardingCaseItem.findMany({ where: { organizationId: user.organizationId, onboardingCaseId: onboardingCase.id, archivedAt: null }, orderBy: [{ dueDate: "asc" }] }),
    prisma.onboardingMilestone.findMany({ where: { organizationId: user.organizationId, onboardingCaseId: onboardingCase.id, archivedAt: null }, orderBy: [{ dueDate: "asc" }] }),
    prisma.ticket.findMany({ where: { organizationId: user.organizationId, relatedOnboardingCaseId: onboardingCase.id, archivedAt: null }, orderBy: [{ updatedAt: "desc" }] }),
    prisma.onboardingComment.findMany({ where: { organizationId: user.organizationId, onboardingCaseId: onboardingCase.id, archivedAt: null }, orderBy: [{ createdAt: "desc" }], take: 8 }),
    prisma.onboardingDocument.findMany({ where: { organizationId: user.organizationId, onboardingCaseId: onboardingCase.id, archivedAt: null }, orderBy: [{ updatedAt: "desc" }] }),
    prisma.onboardingStatusHistory.findMany({ where: { organizationId: user.organizationId, onboardingCaseId: onboardingCase.id, archivedAt: null }, orderBy: [{ createdAt: "desc" }], take: 10 }),
    prisma.approvalRequest.findMany({ where: { organizationId: user.organizationId, sourceType: "onboarding_case", sourceId: onboardingCase.id, archivedAt: null }, orderBy: [{ updatedAt: "desc" }] }),
    prisma.blocker.findMany({ where: { organizationId: user.organizationId, linkedOnboardingCaseId: onboardingCase.id, archivedAt: null }, orderBy: [{ updatedAt: "desc" }] })
  ]);

  const readyItems = [
    ["Payroll Coordination", onboardingCase.payrollSetupRequired ? "Required" : "Not Required"],
    ["Timekeeping Setup", onboardingCase.timekeepingSetupRequired ? "Required" : "Not Required"],
    ["Equipment Status", onboardingCase.equipmentRequired ? "Required" : "Not Required"],
    ["Workspace Status", onboardingCase.workspaceRequired ? "Required" : "Not Required"],
    ["Training Status", onboardingCase.trainingRequired ? "Required" : "Not Required"],
    ["Policy Acknowledgments", onboardingCase.policyAcknowledgmentsRequired ? "Required" : "Not Required"]
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Onboarding Center · Onboarding Cases · {onboardingCase.caseNumber}</p>
          <h1>Onboarding Case: {onboardingCase.firstName} {onboardingCase.lastName}</h1>
          <p className="subhead">{department?.name ?? "Department"} · {onboardingCase.jobTitle ?? "Job title pending"} · Start Date {dateLabel(onboardingCase.startDate)}</p>
        </div>
        <div className="actions">
          <Link className="button primary" href="/workflows/department-ticket-centers"><Plus size={18} />Create Ticket</Link>
          <Link className="button dark" href="/workflows/manager-task-board"><Plus size={18} />Add Task</Link>
          <Link className="button" href="/workflows/approval-queue"><BadgeCheck size={18} />Request Approval</Link>
          <Link className="button primary" href="/workflows/reports-exports"><FileText size={18} />Generate Summary</Link>
        </div>
      </div>

      <div className="grid kpi-grid">
        <section className="card kpi">
          <div className="kpi-top"><span className="metric-label">Readiness Score</span><ClipboardCheck className="tone-green" /></div>
          <div><div className="metric-value tone-green">{onboardingCase.readinessScore}%</div><div className="metric-note">{onboardingCase.status}</div></div>
        </section>
        {readyItems.map(([label, value]) => (
          <section className="card kpi" key={label}>
            <div className="kpi-top"><span className="metric-label">{label}</span><UserPlus size={20} /></div>
            <div><div className="metric-value">{value}</div><div className="metric-note">Tracked by case items and tickets</div></div>
          </section>
        ))}
      </div>

      <div className="grid content-grid" style={{ marginTop: 14 }}>
        <div className="grid">
          <div className="grid two-col">
            <section className="card">
              <div className="section-title"><h2>Employee Summary</h2><span className="pill">{onboardingCase.employmentType}</span></div>
              <div className="card-pad">
                <ul className="compact-list">
                  <li><span>Name</span><strong>{onboardingCase.preferredName ?? onboardingCase.firstName} {onboardingCase.lastName}</strong></li>
                  <li><span>Personal Email</span><strong>{onboardingCase.personalEmail ?? "Not recorded"}</strong></li>
                  <li><span>Phone</span><strong>{onboardingCase.phone ?? "Not recorded"}</strong></li>
                  <li><span>Employee ID</span><strong>{onboardingCase.employeeId ?? "Pending"}</strong></li>
                  <li><span>Work Area</span><strong>{onboardingCase.workArea ?? "Pending"}</strong></li>
                </ul>
              </div>
            </section>

            <section className="card">
              <div className="section-title"><h2>Job Details</h2><span className="pill green">{onboardingCase.status}</span></div>
              <div className="card-pad">
                <ul className="compact-list">
                  <li><span>Department</span><strong>{department?.name ?? onboardingCase.departmentId}</strong></li>
                  <li><span>Job Title</span><strong>{onboardingCase.jobTitle ?? onboardingCase.jobTitleId ?? "Pending"}</strong></li>
                  <li><span>Pay Type</span><strong>{onboardingCase.payType ?? "Pending"}</strong></li>
                  <li><span>Pay Rate Summary</span><strong>{onboardingCase.payRateSummary ?? "Restricted / pending"}</strong></li>
                  <li><span>First-Day Plan</span><strong>{onboardingCase.firstDaySchedule ?? "Pending"}</strong></li>
                </ul>
              </div>
            </section>
          </div>

          <div className="grid three-col">
            <DetailCard title="Assigned Tasks" count={items.length} rows={items.map((item) => [item.title, item.status])} />
            <DetailCard title="Department Tickets" count={tickets.length} rows={tickets.map((ticket) => [ticket.ticketNumber, ticket.status])} />
            <DetailCard title="30/60/90 Milestones" count={milestones.length} rows={milestones.map((milestone) => [milestone.milestoneType, milestone.status])} />
          </div>

          <div className="grid three-col">
            <DetailCard title="Documents" count={documents.length} rows={documents.map((doc) => [doc.documentType, doc.status])} />
            <DetailCard title="Approvals" count={approvals.length} rows={approvals.map((approval) => [approval.approvalType, approval.status])} />
            <DetailCard title="Blockers" count={blockers.length} rows={blockers.map((blocker) => [blocker.title, blocker.status])} />
          </div>
        </div>

        <aside className="grid">
          <section className="card">
            <div className="section-title"><h2>Activity Timeline</h2><span className="pill">All Activity</span></div>
            <div className="queue">
              {history.length ? (
                history.map((event) => (
                  <div className="queue-item" key={event.id}>
                    <BadgeCheck className="tone-green" size={22} />
                    <div>
                      <strong>Status changed to {event.toStatus}</strong>
                      <span>{dateLabel(event.createdAt)} · {event.reason ?? "No reason recorded"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">No status history has been recorded yet.</div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="section-title"><h2>Comments</h2><span className="pill">{comments.length}</span></div>
            <div className="queue">
              {comments.length ? (
                comments.map((comment) => (
                  <div className="queue-item" key={comment.id}>
                    <FileText size={22} />
                    <div>
                      <strong>{comment.visibility.replaceAll("_", " ")}</strong>
                      <span>{comment.body}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty">No comments have been added.</div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="section-title"><h2>Safety Boundary</h2><AlertTriangle className="tone-amber" size={18} /></div>
            <div className="card-pad">
              <ul className="compact-list">
                <li><span>No full SSN</span><span className="pill green">Blocked</span></li>
                <li><span>No bank data</span><span className="pill green">Blocked</span></li>
                <li><span>Payroll coordination only</span><span className="pill green">Enforced</span></li>
                <li><span>Audit history</span><span className="pill green">On</span></li>
              </ul>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function DetailCard({ title, count, rows }: { title: string; count: number; rows: string[][] }) {
  return (
    <section className="card">
      <div className="section-title"><h2>{title}</h2><span className="pill">{count}</span></div>
      <div className="card-pad">
        {rows.length ? (
          <ul className="compact-list">
            {rows.slice(0, 6).map(([label, status]) => (
              <li key={`${label}-${status}`}>
                <span>{label}</span>
                <span className={status.includes("Complete") || status.includes("Ready") ? "pill green" : status.includes("Blocked") ? "pill red" : "pill amber"}>{status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">No records linked yet.</div>
        )}
      </div>
    </section>
  );
}
