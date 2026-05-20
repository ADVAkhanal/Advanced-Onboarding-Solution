import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  Gauge,
  Inbox,
  ListChecks,
  ShieldAlert,
  TrendingUp,
  UserPlus,
  WalletCards
} from "lucide-react";
import type { CommandCenterData } from "@/lib/dashboard";
import type { AuthenticatedUser } from "@/lib/auth";
import { KpiCard } from "./kpi-card";

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

function priorityTone(priority: string) {
  if (priority === "WORK_STOPPAGE" || priority === "URGENT") return "red";
  if (priority === "HIGH") return "amber";
  return "green";
}

export function DashboardView({ data, user, variant = "executive" }: { data: CommandCenterData; user: AuthenticatedUser; variant?: "executive" | "director" | "manager" | "employee" }) {
  const heading =
    variant === "director"
      ? "Director Oversight Dashboard"
      : variant === "manager"
        ? "Manager Dashboard"
        : variant === "employee"
          ? "User Portal"
          : "Executive Command Dashboard";

  const subhead =
    variant === "employee"
      ? "My tasks, tickets, onboarding, time-off, payroll questions, schedule issues, training, documents, and announcements."
      : variant === "manager"
        ? "Department tickets, onboarding, payroll requests, time-off, attendance, recurring work, blockers, and follow-ups."
        : variant === "director"
          ? "Cross-department visibility, manager productivity, escalations, approvals, workload, readiness, and blockers."
          : "Real-time visibility. Operational clarity. Manager-led performance.";

  const kpis = [
    { label: "Open Department Tickets", value: data.metrics.openTickets, note: "Owned, tracked, and aging", icon: Inbox, tone: "blue" as const },
    { label: "Overdue Tickets", value: data.metrics.overdueTickets, note: data.metrics.overdueTickets ? "Needs attention" : "No overdue tickets", icon: AlertTriangle, tone: data.metrics.overdueTickets ? ("red" as const) : ("green" as const) },
    { label: "Onboarding Readiness", value: `${data.metrics.onboardingReadiness}%`, note: `${data.metrics.activeOnboarding} active cases`, icon: UserPlus, tone: data.metrics.onboardingReadiness >= 80 ? ("green" as const) : ("amber" as const) },
    { label: "Payroll Coordination", value: data.metrics.payrollPending, note: `${data.metrics.payrollReadiness}% readiness`, icon: WalletCards, tone: data.metrics.payrollPending ? ("amber" as const) : ("green" as const) },
    { label: "Time-Off Requests", value: data.metrics.timeOffPending, note: "Awaiting review", icon: CalendarClock, tone: data.metrics.timeOffPending ? ("amber" as const) : ("green" as const) },
    { label: "Manager Approvals", value: data.metrics.approvalsPending, note: "Pending decisions", icon: BadgeCheck, tone: data.metrics.approvalsPending ? ("amber" as const) : ("green" as const) },
    { label: "Department Productivity", value: `${data.metrics.productivityScore}%`, note: "Score from open work", icon: TrendingUp, tone: data.metrics.productivityScore >= 80 ? ("green" as const) : ("amber" as const) },
    { label: "Unresolved Blockers", value: data.metrics.blockersOpen, note: "Escalate before they bury work", icon: ShieldAlert, tone: data.metrics.blockersOpen ? ("red" as const) : ("green" as const) },
    { label: "Work Stoppage Tickets", value: data.metrics.workStoppageTickets, note: "Immediate operational impact", icon: AlertTriangle, tone: data.metrics.workStoppageTickets ? ("red" as const) : ("green" as const) },
    { label: "Recurring Misses", value: data.metrics.checklistMissed, note: "Missed checklist completions", icon: ListChecks, tone: data.metrics.checklistMissed ? ("amber" as const) : ("green" as const) },
    { label: "Lifecycle Items", value: data.metrics.lifecyclePending, note: "Pending employee events", icon: ClipboardCheck, tone: data.metrics.lifecyclePending ? ("amber" as const) : ("green" as const) },
    { label: "Contractor Expirations", value: data.metrics.contractorExpirations, note: "Upcoming reminders", icon: Gauge, tone: data.metrics.contractorExpirations ? ("amber" as const) : ("green" as const) }
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{user.userLevel.replaceAll("_", " ")}</p>
          <h1>{heading}</h1>
          <p className="subhead">{subhead}</p>
        </div>
        <div className="actions">
          <Link className="button primary" href="/tickets">
            <Inbox size={18} />
            Create Ticket
          </Link>
          <Link className="button dark" href="/onboarding">
            <UserPlus size={18} />
            Create Onboarding Request
          </Link>
          <Link className="button" href="/reports">
            <ClipboardCheck size={18} />
            Generate Report
          </Link>
        </div>
      </div>

      <div className="grid kpi-grid">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid content-grid" style={{ marginTop: 14 }}>
        <div className="grid">
          <section className="card">
            <div className="section-title">
              <h2>Department Health Overview</h2>
              <Link className="link" href="/reports">View Full Report</Link>
            </div>
            <div className="card-pad bar-list">
              {data.departmentHealth.length ? (
                data.departmentHealth.map((department) => (
                  <div className="bar-row" key={department.id}>
                    <strong>{department.name}</strong>
                    <div className="bar-track">
                      <div className={`bar-fill ${department.score < 70 ? "bad" : department.score < 84 ? "warn" : ""}`} style={{ width: `${department.score}%` }} />
                    </div>
                    <span>{department.score}%</span>
                  </div>
                ))
              ) : (
                <div className="empty">Departments will appear after the reference seed is loaded.</div>
              )}
            </div>
          </section>

          <div className="grid two-col">
            <section className="card">
              <div className="section-title">
                <h2>Ticket Aging Trend</h2>
                <Link className="link" href="/tickets">View All Tickets</Link>
              </div>
              <div className="chart" aria-label="Ticket aging chart">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div className="chart-stack" key={index}>
                    <div className="stack-c" style={{ height: `${10 + data.metrics.overdueTickets * 2 + index * 2}%` }} />
                    <div className="stack-b" style={{ height: `${12 + index * 1.5}%` }} />
                    <div className="stack-a" style={{ height: `${18 + data.metrics.openTickets + index}%` }} />
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="section-title">
                <h2>Onboarding Completion</h2>
                <Link className="link" href="/onboarding">View Onboarding</Link>
              </div>
              <div className="card-pad">
                <div className="donut">
                  <div className="donut-inner">
                    <div>
                      <div className="metric-value">{data.metrics.onboardingReadiness}%</div>
                      <div className="metric-note">Ready</div>
                    </div>
                  </div>
                </div>
                <ul className="compact-list">
                  <li><span>Active cases</span><strong>{data.metrics.activeOnboarding}</strong></li>
                  <li><span>Lifecycle items</span><strong>{data.metrics.lifecyclePending}</strong></li>
                  <li><span>Contractor expirations</span><strong>{data.metrics.contractorExpirations}</strong></li>
                </ul>
              </div>
            </section>
          </div>

          <div className="grid two-col">
            <section className="card">
              <div className="section-title">
                <h2>Recent Department Tickets</h2>
                <Link className="link" href="/tickets">View All Tickets</Link>
              </div>
              {data.recentTickets.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td><Link className="link" href={`/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link></td>
                        <td>{ticket.title}</td>
                        <td><span className={`pill ${priorityTone(ticket.priority)}`}>{ticket.priority.replaceAll("_", " ")}</span></td>
                        <td>{ticket.status}</td>
                        <td>{formatDate(ticket.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty">No department tickets are open in your scope.</div>
              )}
            </section>

            <section className="card">
              <div className="section-title">
                <h2>New Hires Starting Soon</h2>
                <Link className="link" href="/onboarding">View All New Hires</Link>
              </div>
              <div className="queue">
                {data.upcomingOnboarding.length ? (
                  data.upcomingOnboarding.map((item) => (
                    <div className="queue-item" key={item.id}>
                      <div className="avatar">{item.firstName[0]}{item.lastName[0]}</div>
                      <div>
                        <strong>{item.firstName} {item.lastName}</strong>
                        <span>{item.jobTitle ?? item.onboardingType}</span>
                      </div>
                      <span className="pill green">{formatDate(item.startDate)}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty">No upcoming onboarding cases in your scope.</div>
                )}
              </div>
            </section>
          </div>
        </div>

        <aside className="grid">
          <section className="card">
            <div className="section-title">
              <h2>Urgent Action Queue</h2>
              <span className="pill red">{data.approvalQueue.length + data.blockers.length}</span>
            </div>
            <div className="queue">
              {[...data.approvalQueue.slice(0, 4), ...data.blockers.slice(0, 4)].length ? (
                <>
                  {data.approvalQueue.slice(0, 4).map((item) => (
                    <div className="queue-item" key={item.id}>
                      <BadgeCheck className="tone-amber" size={24} />
                      <div>
                        <strong>{item.approvalType}</strong>
                        <span>{item.summary}</span>
                      </div>
                      <span className="pill amber">{formatDate(item.dueDate)}</span>
                    </div>
                  ))}
                  {data.blockers.slice(0, 4).map((item) => (
                    <div className="queue-item" key={item.id}>
                      <AlertTriangle className="tone-red" size={24} />
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.description ?? "Blocked item"}</span>
                      </div>
                      <span className="pill red">{item.priority.replaceAll("_", " ")}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="empty">No urgent approvals or blockers in your scope.</div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="section-title">
              <h2>Payroll Period Readiness</h2>
              <Link className="link" href="/payroll-coordination">Payroll Center</Link>
            </div>
            <div className="card-pad">
              <div className="donut">
                <div className="donut-inner">
                  <div>
                    <div className="metric-value">{data.metrics.payrollReadiness}%</div>
                    <div className="metric-note">{data.payrollPeriod?.label ?? "No active period"}</div>
                  </div>
                </div>
              </div>
              <ul className="compact-list">
                <li><span>Payroll requests pending</span><strong>{data.metrics.payrollPending}</strong></li>
                <li><span>Manager approvals</span><strong>{data.metrics.approvalsPending}</strong></li>
                <li><span>Safe export status</span><strong>{data.metrics.payrollPending ? "Review" : "Ready"}</strong></li>
              </ul>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
