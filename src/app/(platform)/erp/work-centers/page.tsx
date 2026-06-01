import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { formatShortDate } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { DataTable, type Column } from "@/components/data-table";
import { WorkCenterUpsertForm } from "./upsert-form";

export const dynamic = "force-dynamic";

type Row = { id: string; code: string; name: string; capacity: number; updated: Date };

export default async function WorkCentersPage() {
  const user = await requirePermission("erp:view");
  const canManage = user.permissions.includes("erp:manage");

  const workCenters = await prisma.workCenter.findMany({
    where: { organizationId: user.organizationId, status: "ACTIVE", archivedAt: null },
    orderBy: { code: "asc" }
  });

  const rows: Row[] = workCenters.map((wc) => ({
    id: wc.id,
    code: wc.code,
    name: wc.name ?? "—",
    capacity: Number(wc.capacityHoursPerWeek),
    updated: wc.updatedAt
  }));

  const columns: Column<Row>[] = [
    { key: "code", header: "Code", render: (r) => <strong>{r.code}</strong> },
    { key: "name", header: "Name", render: (r) => r.name },
    { key: "capacity", header: "Capacity (h/wk)", numeric: true, render: (r) => r.capacity.toFixed(1) },
    { key: "updated", header: "Updated", render: (r) => formatShortDate(r.updated) }
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Production Control · Capacity</p>
          <h1>Work Centers</h1>
          <p className="subhead">
            Weekly capacity per work center. Powers real load-vs-capacity utilization on the
            Advanced Capacity dashboard. {canManage ? "Add or edit below." : "Read-only — manager or above to edit."}
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/erp/dashboards/advanced-capacity">Capacity dashboard</Link>
          <Link className="button" href="/erp/jobs">← Jobs</Link>
        </div>
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Configured work centers</h2>
          <span className="pill">{rows.length}</span>
        </div>
        <div style={{ padding: "0 4px 4px" }}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            caption="Work centers"
            emptyLabel="No work centers configured yet. Add one below."
          />
        </div>
      </section>

      {canManage ? (
        <div style={{ marginTop: 14 }}>
          <WorkCenterUpsertForm />
        </div>
      ) : null}
    </>
  );
}
