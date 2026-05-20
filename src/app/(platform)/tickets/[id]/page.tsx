import Link from "next/link";
import { notFound } from "next/navigation";
import { canAccessDepartment, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TicketCenterDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission("ticket:view");
  const center = await prisma.ticketCenter.findFirst({
    where: { id: params.id, organizationId: user.organizationId, archivedAt: null }
  });
  if (!center || !canAccessDepartment(user, center.departmentId)) {
    notFound();
  }

  const [department, categories, tickets] = await Promise.all([
    prisma.department.findFirst({ where: { id: center.departmentId, organizationId: user.organizationId } }),
    prisma.ticketCategory.findMany({ where: { organizationId: user.organizationId, ticketCenterId: center.id, active: true, archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.ticket.findMany({ where: { organizationId: user.organizationId, ticketCenterId: center.id, archivedAt: null }, orderBy: [{ updatedAt: "desc" }], take: 100 })
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{department?.name ?? "Department"} · Ticket Center</p>
          <h1>{center.name}</h1>
          <p className="subhead">Department-specific queue, saved filters, ownership rules, categories, comments, internal notes, SLA-style targets, and escalation tracking.</p>
        </div>
        <div className="actions">
          <Link className="button primary" href="/workflows/department-ticket-centers">Create Ticket</Link>
          <Link className="button" href="/workflows/escalation-queue">Escalation Queue</Link>
        </div>
      </div>

      <div className="grid two-col">
        <section className="card">
          <div className="section-title"><h2>Category Routing</h2><span className="pill">{categories.length}</span></div>
          <div className="card-pad field-grid">
            {categories.map((category) => (
              <span className="field-chip" key={category.id}>{category.name}</span>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="section-title"><h2>Ownership Rules</h2><span className="pill green">Active</span></div>
          <div className="card-pad">
            <ul className="compact-list">
              <li><span>Managers see assigned department</span><strong>Yes</strong></li>
              <li><span>Directors see oversight departments</span><strong>Yes</strong></li>
              <li><span>Global Admin / CEO sees all</span><strong>Yes</strong></li>
              <li><span>Owner and due date required</span><strong>Yes</strong></li>
            </ul>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>Queue</h2><span className="pill">{tickets.length}</span></div>
        {tickets.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td><span className="link">{ticket.ticketNumber}</span></td>
                  <td>{ticket.title}</td>
                  <td><span className={ticket.priority === "WORK_STOPPAGE" ? "pill red" : ticket.priority === "HIGH" || ticket.priority === "URGENT" ? "pill amber" : "pill green"}>{ticket.priority.replaceAll("_", " ")}</span></td>
                  <td>{ticket.status}</td>
                  <td>{ticket.ownerId ?? "Unassigned"}</td>
                  <td>{ticket.dueDate ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(ticket.dueDate) : "Not set"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No tickets are currently recorded in this department queue.</div>
        )}
      </section>
    </>
  );
}
