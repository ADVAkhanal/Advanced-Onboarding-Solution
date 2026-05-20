import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDepartmentsPage() {
  const user = await requirePermission("admin:manage");
  const departments = await prisma.department.findMany({
    where: { organizationId: user.organizationId, archivedAt: null },
    orderBy: { name: "asc" },
    take: 200
  });

  const centers = await prisma.ticketCenter.findMany({
    where: { organizationId: user.organizationId, archivedAt: null },
    orderBy: { name: "asc" },
    take: 200
  });

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin · Departments</p>
          <h1>Departments and ticket centers</h1>
          <p className="subhead">Each department can operate its own request queue with scoped manager visibility and director/admin oversight.</p>
        </div>
      </div>

      <div className="grid two-col">
        <section className="card">
          <div className="section-title"><h2>Departments</h2><span className="pill">{departments.length}</span></div>
          <div className="card-pad">
            {departments.length ? (
              <ul className="compact-list">
                {departments.map((department) => (
                  <li key={department.id}><span>{department.name}</span><strong>{department.code}</strong></li>
                ))}
              </ul>
            ) : (
              <div className="empty">No departments configured yet. Run the reference seed or add departments before production use.</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="section-title"><h2>Ticket Centers</h2><Link className="link" href="/tickets">Open Ticket Centers</Link></div>
          <div className="card-pad">
            {centers.length ? (
              <ul className="compact-list">
                {centers.map((center) => (
                  <li key={center.id}><span>{center.name}</span><strong>{center.active ? "Active" : "Inactive"}</strong></li>
                ))}
              </ul>
            ) : (
              <div className="empty">No ticket centers exist yet. Department centers are created by the reference seed.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
