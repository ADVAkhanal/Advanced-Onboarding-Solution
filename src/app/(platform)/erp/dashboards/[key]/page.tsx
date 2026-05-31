import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { DashboardRender } from "@/components/dashboard-render";
import { getDashboard } from "@/lib/dashboards/registry";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params }: { params: { key: string } }) {
  const def = getDashboard(params.key);
  if (!def) {
    notFound();
  }

  const user = await requirePermission(def.permission);
  const data = await def.load({ organizationId: user.organizationId, user });

  const hasExportableTable = data.widgets.some(
    (w) => w.kind === "table" && w.exportable !== false
  );

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{def.eyebrow}</p>
          <h1>{def.title}</h1>
          <p className="subhead">{def.description}</p>
        </div>
        <div className="actions">
          {hasExportableTable ? (
            <a className="button" href={`/api/erp/dashboards/${def.key}/export.csv`}>
              Export CSV
            </a>
          ) : null}
          <Link className="button" href={`/erp/dashboards/${def.key}/print`}>
            Print / PDF
          </Link>
          <Link className="button" href="/erp/dashboards">
            ← All dashboards
          </Link>
        </div>
      </div>

      <DashboardRender data={data} />
    </>
  );
}
