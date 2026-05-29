import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { formatShortDate } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { complexityLabel, diameterLabel, materialLabel, processLabel } from "@/lib/quoting";
import { DataTable, type Column } from "@/components/data-table";
import { CycleTimeUpsertForm } from "./upsert-form";
import { LogActualForm } from "./log-actual-form";

export const dynamic = "force-dynamic";

type LookupRow = {
  id: string;
  bucketLabel: string;
  materialCategory: string;
  process: string;
  complexityClass: string;
  diameterClass: string;
  estimatedSetupHours: number;
  estimatedCycleMinutes: number;
  sampleSize: number;
  confidenceScore: number | null;
  source: string;
  lastReviewedAt: Date | null;
};

function sourceBadge(source: string): { className: string; label: string } {
  if (source === "DERIVED") return { className: "pill green", label: "Derived" };
  if (source === "SEED") return { className: "pill amber", label: "Seed" };
  return { className: "pill", label: "Manual" };
}

export default async function CycleTimeAdminPage() {
  const user = await requirePermission("cycletime:view");
  const canManage = user.permissions.includes("cycletime:manage");
  const canRecord = user.permissions.includes("jobactual:record");

  const lookups = await prisma.cycleTimeLookup.findMany({
    where: {
      organizationId: user.organizationId,
      status: "ACTIVE",
      archivedAt: null
    },
    orderBy: [
      { materialCategory: "asc" },
      { process: "asc" },
      { complexityClass: "asc" },
      { diameterClass: "asc" }
    ]
  });

  const rows: LookupRow[] = lookups.map((lookup) => {
    const bucketParts = [
      materialLabel(lookup.materialCategory),
      processLabel(lookup.process),
      complexityLabel(lookup.complexityClass)
    ];
    if (lookup.diameterClass !== "NOT_APPLICABLE") {
      bucketParts.push(diameterLabel(lookup.diameterClass));
    }
    return {
      id: lookup.id,
      bucketLabel: bucketParts.join(" · "),
      materialCategory: lookup.materialCategory,
      process: lookup.process,
      complexityClass: lookup.complexityClass,
      diameterClass: lookup.diameterClass,
      estimatedSetupHours: Number(lookup.estimatedSetupHours),
      estimatedCycleMinutes: Number(lookup.estimatedCycleMinutes),
      sampleSize: lookup.sampleSize,
      confidenceScore: lookup.confidenceScore ? Number(lookup.confidenceScore) : null,
      source: lookup.source,
      lastReviewedAt: lookup.lastReviewedAt
    };
  });

  const columns: Column<LookupRow>[] = [
    {
      key: "bucket",
      header: "Bucket",
      render: (row) => (
        <>
          <div style={{ fontWeight: 600 }}>{row.bucketLabel}</div>
          <div className="metric-note">
            Diameter: {diameterLabel(row.diameterClass as never)}
          </div>
        </>
      )
    },
    {
      key: "setup",
      header: "Setup hrs",
      numeric: true,
      width: "110px",
      render: (row) => row.estimatedSetupHours.toFixed(2)
    },
    {
      key: "cycle",
      header: "Cycle min/pc",
      numeric: true,
      width: "120px",
      render: (row) => row.estimatedCycleMinutes.toFixed(2)
    },
    {
      key: "sample",
      header: "Samples",
      numeric: true,
      width: "100px",
      render: (row) => row.sampleSize
    },
    {
      key: "confidence",
      header: "Conf.",
      numeric: true,
      width: "90px",
      render: (row) => {
        if (row.confidenceScore == null) return "—";
        const pct = (row.confidenceScore * 100).toFixed(0);
        const tone =
          row.confidenceScore >= 0.8
            ? "pill green"
            : row.confidenceScore >= 0.65
              ? "pill"
              : "pill amber";
        return <span className={tone}>{pct}%</span>;
      }
    },
    {
      key: "source",
      header: "Source",
      width: "100px",
      render: (row) => {
        const badge = sourceBadge(row.source);
        return <span className={badge.className}>{badge.label}</span>;
      }
    },
    {
      key: "reviewed",
      header: "Reviewed",
      width: "130px",
      render: (row) => formatShortDate(row.lastReviewedAt)
    }
  ];

  const derivedCount = rows.filter((r) => r.source === "DERIVED").length;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Sales Operations · Quoting</p>
          <h1>Cycle-Time Lookups</h1>
          <p className="subhead">
            Historical setup / cycle estimates per material × process × complexity × diameter
            bucket. The manufacturing intake form pre-fills setup and cycle minutes from these
            rows when a bucket matches.{" "}
            {derivedCount > 0
              ? `${derivedCount} estimate${derivedCount === 1 ? " is" : "s are"} derived from logged job actuals.`
              : "Log job actuals below to start deriving estimates from real history."}
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/erp/quotes">
            ← Back to quotes
          </Link>
        </div>
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Active lookups</h2>
          <span className="pill">{rows.length}</span>
        </div>
        <div style={{ padding: "0 4px 4px" }}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            caption="Cycle-time lookup buckets"
            emptyLabel="No cycle-time lookups configured yet. Add one below."
          />
        </div>
      </section>

      {canRecord ? (
        <div style={{ marginTop: 14 }}>
          <LogActualForm />
        </div>
      ) : null}

      {canManage ? (
        <div style={{ marginTop: 14 }}>
          <CycleTimeUpsertForm />
        </div>
      ) : null}
    </>
  );
}
