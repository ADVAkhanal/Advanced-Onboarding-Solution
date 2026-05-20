import Link from "next/link";
import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const openStatuses = ["New", "Assigned", "In Progress", "Waiting on Requester", "Waiting on Manager", "Waiting on Director", "Blocked", "Escalated", "Reopened"];

export default async function TicketCentersPage() {
  const user = await requirePermission("ticket:view");
  const ticketScope =
    user.userLevel === "USER"
      ? { OR: [{ requestedById: user.id }, { requestedForId: user.id }] }
      : departmentScopeForUser(user);
  const centers = await prisma.ticketCenter.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      ...departmentScopeForUser(user)
    },
    orderBy: { name: "asc" }
  });

  const rows = await Promise.all(
    centers.map(async (center) => {
      const [department, open, overdue, workStoppage, categories] = await Promise.all([
        prisma.department.findFirst({ where: { id: center.departmentId, organizationId: user.organizationId } }),
        prisma.ticket.count({ where: { organizationId: user.organizationId, ticketCenterId: center.id, status: { in: openStatuses }, archivedAt: null } }),
        prisma.ticket.count({ where: { organizationId: user.organizationId, ticketCenterId: center.id, status: { in: openStatuses }, dueDate: { lt: new Date() }, archivedAt: null } }),
        prisma.ticket.count({ where: { organizationId: user.organizationId, ticketCenterId: center.id, priority: "WORK_STOPPAGE", status: { in: openStatuses }, archivedAt: null } }),
        prisma.ticketCategory.count({ where: { organizationId: user.organizationId, ticketCenterId: center.id, active: true, archivedAt: null } })
      ]);
      return { center, department, open, overdue, workStoppage, categories };
    })
  );
  const tickets = await prisma.ticket.findMany({
    where: { organizationId: user.organizationId, archivedAt: null, ...ticketScope },
    orderBy: [{ updatedAt: "desc" }],
    take: 50
  });

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Department Ticket Centers</p>
          <h1>Ticket Centers</h1>
          <p className="subhead">Every department queue has ownership, status, due dates, categories, internal notes, escalation rules, and aging visibility.</p>
        </div>
        <Link className="button primary" href="/workflows/department-ticket-centers">Create Ticket</Link>
      </div>
      {user.userLevel !== "USER" ? (
        <div className="grid three-col">
          {rows.map((row) => (
            <Link className="card card-pad" href={`/tickets/${row.center.id}`} key={row.center.id}>
            <div className="section-title" style={{ padding: 0, borderBottom: 0, marginBottom: 12 }}>
              <h2>{row.center.name}</h2>
              <span className={row.overdue ? "pill red" : "pill green"}>{row.department?.name ?? "Department"}</span>
            </div>
            <ul className="compact-list">
              <li><span>Open tickets</span><strong>{row.open}</strong></li>
              <li><span>Overdue</span><strong>{row.overdue}</strong></li>
              <li><span>Work stoppage</span><strong>{row.workStoppage}</strong></li>
              <li><span>Categories</span><strong>{row.categories}</strong></li>
            </ul>
            </Link>
          ))}
        </div>
      ) : null}

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>{user.userLevel === "USER" ? "My Tickets" : "Recent Tickets"}</h2><span className="pill">{tickets.length}</span></div>
        {tickets.length ? (
          <table className="table">
            <thead><tr><th>Ticket ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Due</th><th>Owner</th></tr></thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td><Link className="link" href={`/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link></td>
                  <td>{ticket.title}</td>
                  <td>{ticket.priority.replaceAll("_", " ")}</td>
                  <td>{ticket.status}</td>
                  <td>{ticket.dueDate ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(ticket.dueDate) : "Not set"}</td>
                  <td>{ticket.ownerId ?? "Unassigned"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">{user.userLevel === "USER" ? "You do not have open tickets yet." : "No tickets are currently recorded in your scope."}</div>
        )}
      </section>
    </>
  );
}
