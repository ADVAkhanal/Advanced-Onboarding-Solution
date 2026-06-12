import { requirePermission } from "@/lib/auth";
import { FUNCTIONAL_AREAS } from "@/lib/blueprint/modules";
import { levelPill, pathPill } from "@/lib/blueprint/types";
import { BlueprintSubnav } from "../blueprint-subnav";

export const dynamic = "force-dynamic";

export default async function BlueprintModulesPage() {
  await requirePermission("report:view");

  const counts = FUNCTIONAL_AREAS.reduce(
    (acc, a) => {
      for (const f of a.features) {
        acc.total += 1;
        if (f.path === "Native" || f.path === "Configuration") acc.nativeOrConfig += 1;
        else if (f.path === "Custom App" || f.path === "Hybrid") acc.customApp += 1;
        else acc.frappeCustom += 1;
      }
      return acc;
    },
    { total: 0, nativeOrConfig: 0, frappeCustom: 0, customApp: 0 }
  );

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Strategy · Fit-Gap</p>
          <h1>Module Fit-Gap Analysis</h1>
          <p className="subhead">
            Every required capability evaluated on the same ladder — native → configuration → custom
            doctype → workflow → scripting → custom app — with complexity, maintenance burden, and
            upgrade risk. The cheapest rung that works wins.
          </p>
        </div>
      </div>

      <BlueprintSubnav active="modules" />

      <div className="grid four-col" style={{ marginBottom: 14 }}>
        <section className="card kpi">
          <div className="metric-label">Capabilities assessed</div>
          <div>
            <div className="metric-value">{counts.total}</div>
            <div className="metric-note">{FUNCTIONAL_AREAS.length} functional areas</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Native / configuration</div>
          <div>
            <div className="metric-value tone-green">{Math.round((counts.nativeOrConfig / counts.total) * 100)}%</div>
            <div className="metric-note">{counts.nativeOrConfig} need no code</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Doctype / workflow / script</div>
          <div>
            <div className="metric-value">{counts.frappeCustom}</div>
            <div className="metric-note">Upgrade-safe in advanced_pmc</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Experience layer</div>
          <div>
            <div className="metric-value tone-amber">{counts.customApp}</div>
            <div className="metric-note">Shop-Management (several live)</div>
          </div>
        </section>
      </div>

      {FUNCTIONAL_AREAS.map((area) => (
        <section className="card" key={area.key} style={{ marginBottom: 14 }}>
          <div className="section-title">
            <h2>{area.title}</h2>
            <span className="pill">Phase {area.phase}</span>
          </div>
          <div className="card-pad" style={{ paddingBottom: 0 }}>
            <p className="metric-note" style={{ marginBottom: 8 }}>{area.summary}</p>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Capability</th>
                <th>ERPNext today</th>
                <th>Path</th>
                <th>Cmplx</th>
                <th>Maint</th>
                <th>Upgrade</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {area.features.map((f) => (
                <tr key={f.feature}>
                  <td style={{ fontWeight: 600, minWidth: 140 }}>{f.feature}</td>
                  <td style={{ minWidth: 180 }}>{f.erpnext}</td>
                  <td>
                    <span className={`pill ${pathPill(f.path)}`}>{f.path}</span>
                  </td>
                  <td>
                    <span className={`pill ${levelPill(f.complexity)}`}>{f.complexity}</span>
                  </td>
                  <td>
                    <span className={`pill ${levelPill(f.maintenance)}`}>{f.maintenance}</span>
                  </td>
                  <td>
                    <span className={`pill ${levelPill(f.upgradeRisk)}`}>{f.upgradeRisk}</span>
                  </td>
                  <td style={{ minWidth: 220 }}>{f.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}
