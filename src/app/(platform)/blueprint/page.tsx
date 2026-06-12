import { requirePermission } from "@/lib/auth";
import { PHASES } from "@/lib/blueprint/phases";
import { levelPill } from "@/lib/blueprint/types";
import { BlueprintSubnav } from "./blueprint-subnav";

export const dynamic = "force-dynamic";

const PRINCIPLES = [
  { title: "Built for machinists, not accountants", body: "Every workflow is measured in clicks and seconds at the machine: one scan to clock on, large touch targets, no menus an operator never needs." },
  { title: "Configuration before customization", body: "Every feature climbs the same ladder: native → configuration → custom doctype → workflow → scripting → custom app. The cheapest rung that works wins." },
  { title: "Never patch core", body: "ERPNext stays pinned and pristine. Customizations live in the advanced_pmc Frappe app and the Shop-Management experience layer, so upgrades stay version bumps." },
  { title: "Single-admin operable", body: "One IT administrator runs the whole stack: managed Postgres/MariaDB, scripted backups with restore drills, health probes, and no bespoke infrastructure to babysit." },
  { title: "Data captured as a by-product", body: "Labor, downtime, inspections, and genealogy are recorded by doing the work — never as a second data-entry pass. AI and scheduling are only as good as this exhaust." },
  { title: "Boundary enforced in code", body: "Operational metadata only. Accounting/payroll/banking/PII stay outside the bridge by allowlist (NIST 800-171 least-access posture, CMMC-aware)." }
];

export default async function BlueprintOverviewPage() {
  await requirePermission("report:view");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Strategy · Manufacturing Operating System</p>
          <h1>Platform Blueprint</h1>
          <p className="subhead">
            The design for a next-generation manufacturing ERP/MES on ERPNext + the Shop-Management
            layer — sequenced for a single IT administrator, upgrade-safe by construction, and aimed
            squarely past ProShop, Fulcrum, JobBOSS, and Global Shop Solutions.
          </p>
        </div>
      </div>

      <BlueprintSubnav active="overview" />

      <section className="card" style={{ marginBottom: 14 }}>
        <div className="section-title">
          <h2>Design philosophy</h2>
          <span className="pill green">Load-bearing</span>
        </div>
        <div className="card-pad">
          <div className="grid three-col">
            {PRINCIPLES.map((p) => (
              <div key={p.title} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8 }}>
                <strong style={{ display: "block", marginBottom: 6 }}>{p.title}</strong>
                <span className="metric-note">{p.body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 14 }}>
        <div className="section-title">
          <h2>Where the platform already is</h2>
          <span className="pill">Head start</span>
        </div>
        <div className="card-pad">
          <div className="module-note">
            This roadmap is not greenfield. The Shop-Management layer already ships the operations
            dashboards (capacity heatmap, shop health, support desk), the Maintenance CMMS, the
            First-Piece/FPY tracker, shift handoff with machine-down sync, the SOP AI assistant, the
            self-improving cycle-time quoting engine, and the read-only ERPNext bridge with its
            operational-doctype allowlist. Each phase below notes what is therefore already live.
          </div>
        </div>
      </section>

      {PHASES.map((phase) => (
        <section className="card" key={phase.number} style={{ marginBottom: 14 }}>
          <div className="section-title">
            <h2>
              Phase {phase.number}: {phase.title}
            </h2>
            <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
              <span className={`pill ${levelPill(phase.technicalRisk)}`}>risk {phase.technicalRisk.toLowerCase()}</span>
              <span className={`pill ${levelPill(phase.upgradeImpact)}`}>upgrade {phase.upgradeImpact.toLowerCase()}</span>
              <span className={`pill ${levelPill(phase.maintenanceBurden)}`}>maint {phase.maintenanceBurden.toLowerCase()}</span>
            </span>
          </div>
          <div className="card-pad">
            <p className="eyebrow" style={{ marginBottom: 8 }}>{phase.tagline}</p>
            <p style={{ marginBottom: 12 }}>{phase.businessValue}</p>
            <div className="grid two-col">
              <div>
                <strong style={{ display: "block", marginBottom: 6 }}>Features</strong>
                <ul className="compact-list">
                  {phase.features.map((f) => (
                    <li key={f}>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: 6 }}>Recommended order</strong>
                <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, fontSize: 13 }}>
                  {phase.implementationOrder.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <div style={{ marginTop: 10 }}>
                  <strong style={{ display: "block", marginBottom: 4 }}>Dependencies</strong>
                  <span className="metric-note">{phase.dependencies.join(" · ")}</span>
                </div>
              </div>
            </div>
            <div className="grid two-col" style={{ marginTop: 12 }}>
              <div className="module-note">
                <strong>Effort:</strong> {phase.effort}
              </div>
              <div className="module-note">
                <strong>Expected ROI:</strong> {phase.roi}
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
