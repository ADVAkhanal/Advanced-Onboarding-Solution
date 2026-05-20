import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await requirePermission("admin:manage");
  const [users, roles, accessRows] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: [{ userLevel: "asc" }, { lastName: "asc" }],
      take: 200
    }),
    prisma.role.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.userDepartmentAccess.findMany({ where: { organizationId: user.organizationId, archivedAt: null }, take: 200 })
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin · Users</p>
          <h1>User, role, and department access control</h1>
          <p className="subhead">Manage the four primary role tiers and verify department-scoped access. Passwords are stored only as hashes.</p>
        </div>
      </div>

      <div className="grid three-col">
        <section className="card kpi"><div className="metric-label">Users</div><div className="metric-value">{users.length}</div><div className="metric-note">Active records</div></section>
        <section className="card kpi"><div className="metric-label">Roles</div><div className="metric-value">{roles.length}</div><div className="metric-note">USER, MANAGER, DIRECTOR, ADMIN</div></section>
        <section className="card kpi"><div className="metric-label">Department grants</div><div className="metric-value">{accessRows.length}</div><div className="metric-note">Manager/director scoping support</div></section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title"><h2>User Directory</h2><span className="pill green">Server-side RBAC</span></div>
        {users.length ? (
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Role Tier</th><th>Department</th><th>Status</th><th>Last Login</th></tr></thead>
            <tbody>
              {users.map((record) => (
                <tr key={record.id}>
                  <td>{record.firstName} {record.lastName}</td>
                  <td>{record.email}</td>
                  <td>{record.userLevel}</td>
                  <td>{record.departmentId ?? "Global / unassigned"}</td>
                  <td>{record.status}</td>
                  <td>{record.lastLoginAt ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(record.lastLoginAt) : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No users exist yet. The bootstrap admin is created from environment variables on first login.</div>
        )}
      </section>
    </>
  );
}
