import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProShopConfigured } from "@/lib/proshop/client";
import { DataTable, type Column } from "@/components/data-table";
import { SyncNowButton } from "./sync-now-button";

export const dynamic = "force-dynamic";

type RunRow = {
  id: string;
  started: string;
  trigger: string;
  status: string;
  seen: number;
  upserted: number;
  stale: number;
  durationMs: number | null;
  error: string;
};

function fmtWhen(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(d) : "—";
}

export default async function ProShopIntegrationPage() {
  const user = await requirePermission("admin:manage");
  const configured = isProShopConfigured();
  const cronConfigured = Boolean(process.env.CRON_SECRET?.trim());

  const [runs, syncedCount, staleCount] = await Promise.all([
    prisma.proShopSyncRun.findMany({
      where: { organizationId: user.organizationId, module: "work_orders" },
      orderBy: { startedAt: "desc" },
      take: 15
    }),
    prisma.proShopWorkOrderRef.count({
      where: { organizationId: user.organizationId, source: "proshop", syncStatus: "synced" }
    }),
    prisma.proShopWorkOrderRef.count({
      where: { organizationId: user.organizationId, source: "proshop", syncStatus: "stale" }
    })
  ]);

  const lastRun = runs[0] ?? null;

  const runRows: RunRow[] = runs.map((r) => ({
    id: r.id,
    started: fmtWhen(r.startedAt),
    trigger: r.trigger,
    status: r.status,
    seen: r.recordsSeen,
    upserted: r.recordsUpserted,
    stale: r.recordsStale,
    durationMs: r.finishedAt ? r.finishedAt.getTime() - r.startedAt.getTime() : null,
    error: r.error ?? ""
  }));

  const columns: Column<RunRow>[] = [
    { key: "started", header: "Started", render: (r) => r.started },
    { key: "trigger", header: "Trigger", render: (r) => r.trigger },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className={r.status === "success" ? "pill green" : r.status === "failed" ? "pill red" : "pill amber"}>
          {r.status}
        </span>
      )
    },
    { key: "seen", header: "Seen", numeric: true, render: (r) => r.seen },
    { key: "upserted", header: "Upserted", numeric: true, render: (r) => r.upserted },
    { key: "stale", header: "Stale", numeric: true, render: (r) => r.stale },
    { key: "duration", header: "Duration", numeric: true, render: (r) => (r.durationMs == null ? "—" : `${(r.durationMs / 1000).toFixed(1)}s`) }
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Integrations · ProShop</p>
          <h1>ProShop Sync</h1>
          <p className="subhead">
            Read-only mirror of ProShop active work orders. ProShop remains the system of record;
            this never writes back. Manual sync below, or schedule via Railway cron.
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/erp/dashboards/proshop-backlog">Backlog dashboard</Link>
          <Link className="button" href="/erp/integrations/erpnext">ERPNext bridge</Link>
        </div>
      </div>

      <div className="grid four-col">
        <section className="card kpi">
          <div className="metric-label">Connection</div>
          <div>
            <div className={`metric-value ${configured ? "tone-green" : "tone-amber"}`}>
              {configured ? "Connected" : "Not set"}
            </div>
            <div className="metric-note">{configured ? "PROSHOP_* present" : "Set PROSHOP_* env"}</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Mirrored work orders</div>
          <div>
            <div className="metric-value">{syncedCount}</div>
            <div className="metric-note">syncStatus = synced</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Stale</div>
          <div>
            <div className={`metric-value ${staleCount > 0 ? "tone-amber" : ""}`}>{staleCount}</div>
            <div className="metric-note">Not seen in last sync</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Last sync</div>
          <div>
            <div className={`metric-value ${lastRun?.status === "failed" ? "tone-red" : lastRun?.status === "success" ? "tone-green" : ""}`} style={{ fontSize: 18 }}>
              {lastRun ? lastRun.status : "Never"}
            </div>
            <div className="metric-note">{fmtWhen(lastRun?.finishedAt ?? lastRun?.startedAt ?? null)}</div>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title">
          <h2>Run a sync</h2>
          <span className={cronConfigured ? "pill green" : "pill"}>{cronConfigured ? "Cron enabled" : "Cron not configured"}</span>
        </div>
        <div className="card-pad">
          <div className="module-note" style={{ marginBottom: 12 }}>
            {configured
              ? "Pulls active work orders from ProShop and refreshes the local mirror. Read-only."
              : "ProShop is not configured. Set PROSHOP_ROOT and a token (or client id/secret) in the environment first."}
            {" "}Scheduled sync: configure a Railway cron to POST /api/cron/proshop-sync with the
            x-cron-secret header (see docs/railway-deploy.md).
          </div>
          <SyncNowButton configured={configured} />
        </div>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title">
          <h2>Recent sync runs</h2>
          <span className="pill">{runRows.length}</span>
        </div>
        <div style={{ padding: "0 4px 4px" }}>
          <DataTable
            columns={columns}
            rows={runRows}
            rowKey={(r) => r.id}
            caption="ProShop sync runs"
            emptyLabel="No sync runs yet."
            stickyHeader={false}
          />
        </div>
        {lastRun?.error ? (
          <div className="card-pad">
            <div className="pill red" role="alert">Last error: {lastRun.error}</div>
          </div>
        ) : null}
      </section>
    </>
  );
}
