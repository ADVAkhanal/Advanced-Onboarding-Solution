import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { DASHBOARDS } from "@/lib/dashboards/registry";

export const dynamic = "force-dynamic";

export default async function DashboardsIndexPage() {
  const user = await requirePermission("report:view");
  const visible = DASHBOARDS.filter((d) => user.permissions.includes(d.permission));

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Operations Dashboards</h1>
          <p className="subhead">
            Live, data-driven dashboards built on this shop&apos;s ERP records. Every dashboard
            exports to CSV and prints to PDF.
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/blueprint">Platform Blueprint</Link>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty">No dashboards available for your role.</div>
      ) : (
        <div className="grid three-col">
          {visible.map((d) => (
            <Link key={d.key} href={`/erp/dashboards/${d.key}`} className="card card-interactive" style={{ padding: 16, display: "block" }}>
              <p className="eyebrow">{d.eyebrow}</p>
              <h2 style={{ margin: "4px 0 6px" }}>{d.title}</h2>
              <p className="metric-note">{d.description}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
