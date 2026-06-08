import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";
import { fmtDate } from "@/lib/maintenance";
import {
  FP_CUSTOMERS,
  FP_DEFECT_CODES,
  FP_INSPECTION_METHODS,
  FP_RESULTS,
  FP_RUN_NUMBERS,
  FP_SETUP_TECHS,
  FP_STATUSES,
  FP_WORK_CENTERS,
  fpResultBucket,
  fpResultPill,
  fpStatusPill
} from "@/lib/first-piece-data";
import { FirstPieceOutcomeForm } from "./first-piece-outcome-form";

export const dynamic = "force-dynamic";

const opt = (values: readonly (string | number)[]) => values.map((v) => ({ label: String(v), value: String(v) }));

export default async function FirstPieceBoardPage() {
  const user = await requirePermission("erp:view");

  const runs = await prisma.firstPieceRun.findMany({
    where: { organizationId: user.organizationId, archivedAt: null },
    orderBy: [{ createdAt: "desc" }],
    take: 300
  });

  let pass = 0;
  let fail = 0;
  let pending = 0;
  let firstPass = 0;
  let firstDecided = 0;
  for (const r of runs) {
    const b = fpResultBucket(r.result);
    if (b === "Pass") pass += 1;
    else if (b === "Fail") fail += 1;
    else pending += 1;
    if ((r.runNumber ?? 1) === 1 && b !== "Pending") {
      firstDecided += 1;
      if (b === "Pass") firstPass += 1;
    }
  }
  const decided = pass + fail;
  const fpy = firstDecided > 0 ? Math.round((firstPass / firstDecided) * 100) : null;
  const defectRate = decided > 0 ? Math.round((fail / decided) * 100) : null;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Quality · First-Piece / NPI</p>
          <h1>First-Piece Run Tracker</h1>
          <p className="subhead">
            Live log of first-article / prove-out runs — outcome, defect codes, setup tech, and inspection method.
            Powers First Pass Yield. Operational metadata only; part numbers are operational identifiers, not drawings.
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/erp/dashboards/first-piece">First-Piece dashboard</Link>
          <Link className="button" href="/erp/quality">Quality &amp; NCRs</Link>
        </div>
      </div>

      <div className="grid four-col" style={{ marginBottom: 14 }}>
        <section className="card kpi">
          <div className="metric-label">First Pass Yield</div>
          <div>
            <div className={`metric-value ${fpy === null ? "" : fpy >= 95 ? "tone-green" : fpy >= 85 ? "tone-amber" : "tone-red"}`}>{fpy === null ? "—" : `${fpy}%`}</div>
            <div className="metric-note">{firstDecided > 0 ? `${firstPass}/${firstDecided} passed run #1` : "No run #1 decided"}</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Defect rate</div>
          <div>
            <div className={`metric-value ${defectRate === null ? "" : defectRate > 10 ? "tone-red" : "tone-amber"}`}>{defectRate === null ? "—" : `${defectRate}%`}</div>
            <div className="metric-note">{decided > 0 ? `${fail} fail of ${decided} decided` : "Nothing decided yet"}</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Pass / Fail / Pending</div>
          <div>
            <div className="metric-value"><span className="tone-green">{pass}</span> / <span className="tone-red">{fail}</span> / <span className="tone-amber">{pending}</span></div>
            <div className="metric-note">{runs.length} runs logged</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Runs (latest)</div>
          <div>
            <div className="metric-value">{runs.length}</div>
            <div className="metric-note">Most recent 300</div>
          </div>
        </section>
      </div>

      <div style={{ marginBottom: 14 }}>
        <ErpCreateForm
          title="Log a first-piece run"
          endpoint="/api/erp/first-piece"
          fields={[
            { name: "wo", label: "WO", required: true },
            { name: "partNumber", label: "Part number" },
            { name: "customer", label: "Customer", type: "select", options: opt(FP_CUSTOMERS) },
            { name: "workCenter", label: "Work center", type: "select", options: opt(FP_WORK_CENTERS) },
            { name: "runNumber", label: "Run #", type: "select", options: opt(FP_RUN_NUMBERS), defaultValue: "1" },
            { name: "opNumber", label: "OP #" },
            { name: "opStartDate", label: "OP start date", type: "date" },
            { name: "dmaxLab", label: "DMAX / LAB" },
            { name: "inspectionMethod", label: "Inspection method", type: "select", options: opt(FP_INSPECTION_METHODS) },
            { name: "setupTech", label: "Setup tech", type: "select", options: opt(FP_SETUP_TECHS) },
            { name: "status", label: "Status", type: "select", options: opt(FP_STATUSES), defaultValue: "On Cycle" },
            { name: "result", label: "Result", type: "select", options: opt(FP_RESULTS) },
            { name: "defectCode", label: "Defect code (if applicable)", type: "select", options: opt(FP_DEFECT_CODES) },
            { name: "detail", label: "Detail to Eng/QC", type: "textarea" }
          ]}
        />
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Run log</h2>
          <span className="pill">{runs.length}</span>
        </div>
        {runs.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>WO</th>
                <th>Part #</th>
                <th>Customer</th>
                <th>WC</th>
                <th>Run</th>
                <th>OP</th>
                <th>Tech</th>
                <th>Status / Result</th>
                <th>Defect</th>
                <th>OP start</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{r.wo}</td>
                  <td>{r.partNumber ?? "—"}</td>
                  <td>{r.customer ?? "—"}</td>
                  <td>{r.workCenter ?? "—"}</td>
                  <td style={{ textAlign: "center" }}>{r.runNumber ?? "—"}</td>
                  <td style={{ textAlign: "center" }}>{r.opNumber ?? "—"}</td>
                  <td>{r.setupTech ?? "—"}</td>
                  <td>
                    <FirstPieceOutcomeForm id={r.id} status={r.status} result={r.result} />
                    <div style={{ marginTop: 4, display: "flex", gap: 4 }}>
                      <span className={`pill ${fpStatusPill(r.status)}`}>{r.status}</span>
                      {r.result ? <span className={`pill ${fpResultPill(r.result)}`}>{r.result}</span> : null}
                    </div>
                  </td>
                  <td>{r.defectCode ?? "—"}</td>
                  <td>{fmtDate(r.opStartDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No first-piece runs logged yet. Log one above to start tracking FPY.</div>
        )}
      </section>
    </>
  );
}
