import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const openStatuses = ["New", "Assigned", "In Progress", "Waiting on Requester", "Waiting on Manager", "Waiting on Director", "Blocked", "Escalated", "Reopened"];

export default async function TicketCentersPage() {
  const user = await requirePermission("ticket:view");
  const centers = await prisma.ticketCenter.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      ...(user.userLevel === "MANAGER" ? { departmentId: user.departmentId ?? "__none__" } : {})
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
    </>
  );
}
