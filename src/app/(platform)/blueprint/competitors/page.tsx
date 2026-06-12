import { requirePermission } from "@/lib/auth";
import { FUNCTIONAL_AREAS } from "@/lib/blueprint/modules";
import { BlueprintSubnav } from "../blueprint-subnav";

export const dynamic = "force-dynamic";

const POSITIONING = [
  { rival: "ProShop", take: "The benchmark for paperless travelers and built-in AS9100 QMS. We match the traveler/QMS substance through ERPNext quality templates + the touch layer, and beat it on per-seat cost (zero), API openness, dashboarding, and a quoting engine that learns from actuals." },
  { rival: "Fulcrum", take: "The benchmark for floor UX and auto-scheduling marketing. We match the operator experience with a purpose-built touch layer and beat it on quality depth, traceability, self-hosted data control, and explainable (planner-driven) scheduling." },
  { rival: "JobBOSS / E2", take: "The legacy job-shop incumbent. We beat it broadly on real-time visibility, barcode-first flows, integrated communications, and modern web UX — its strengths are familiarity and installed base, not capability." },
  { rival: "Global Shop Solutions", take: "Deep but heavy. We beat it on usability, training time, and single-admin operability; it wins only where a shop wants one monolithic on-prem suite with consultant-driven configuration." }
];

export default async function BlueprintCompetitorsPage() {
  await requirePermission("report:view");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Strategy · Differentiation</p>
          <h1>Competitive Differentiation</h1>
          <p className="subhead">
            Module-by-module against ProShop, Fulcrum, JobBOSS/E2, and Global Shop Solutions — with the
            honest weakness and the improvement that closes it. Structural edges: zero per-seat licensing,
            an open API-first data model, and a quoting loop that learns from this shop&apos;s own actuals.
          </p>
        </div>
      </div>

      <BlueprintSubnav active="competitors" />

      <section className="card" style={{ marginBottom: 14 }}>
        <div className="section-title">
          <h2>Positioning at a glance</h2>
        </div>
        <div className="card-pad">
          <div className="grid two-col">
            {POSITIONING.map((p) => (
              <div key={p.rival} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8 }}>
                <strong style={{ display: "block", marginBottom: 6 }}>vs {p.rival}</strong>
                <span className="metric-note">{p.take}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {FUNCTIONAL_AREAS.map((area) => (
        <section className="card" key={area.key} style={{ marginBottom: 14 }}>
          <div className="section-title">
            <h2>{area.title}</h2>
            <span className="pill">Phase {area.phase}</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>ProShop</th>
                <th>Fulcrum</th>
                <th>JobBOSS / E2</th>
                <th>Global Shop</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{area.competitors.proshop}</td>
                <td>{area.competitors.fulcrum}</td>
                <td>{area.competitors.jobboss}</td>
                <td>{area.competitors.gss}</td>
              </tr>
            </tbody>
          </table>
          <div className="card-pad">
            <div className="grid two-col">
              <div className="module-note">
                <strong>Our edge:</strong> {area.competitors.edge}
              </div>
              <div className="module-note">
                <strong>Honest weakness → improvement:</strong> {area.competitors.weakness}
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
