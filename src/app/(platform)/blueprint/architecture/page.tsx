import { requirePermission } from "@/lib/auth";
import { ARCHITECTURE_DOMAINS, ENVIRONMENTS } from "@/lib/blueprint/architecture";
import { BlueprintSubnav } from "../blueprint-subnav";

export const dynamic = "force-dynamic";

export default async function BlueprintArchitecturePage() {
  await requirePermission("report:view");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Strategy · Architecture</p>
          <h1>Platform Architecture</h1>
          <p className="subhead">
            Four environments and six architecture domains, sized for one IT administrator. Boring on
            purpose: managed services over self-run, pinned versions over latest, scripted drills over
            heroics.
          </p>
        </div>
      </div>

      <BlueprintSubnav active="architecture" />

      <section className="card" style={{ marginBottom: 14 }}>
        <div className="section-title">
          <h2>Environments</h2>
          <span className="pill">dev → CI → staging → prod</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Environment</th>
              <th>Purpose</th>
              <th>Topology</th>
              <th>Refresh</th>
            </tr>
          </thead>
          <tbody>
            {ENVIRONMENTS.map((env) => (
              <tr key={env.name}>
                <td style={{ fontWeight: 600 }}>{env.name}</td>
                <td>{env.purpose}</td>
                <td>{env.topology}</td>
                <td>{env.refresh}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid two-col">
        {ARCHITECTURE_DOMAINS.map((domain) => (
          <section className="card" key={domain.key}>
            <div className="section-title">
              <h2>{domain.title}</h2>
            </div>
            <div className="card-pad">
              <ul className="compact-list" style={{ marginBottom: 10 }}>
                {domain.decisions.map((d) => (
                  <li key={d}>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
              <div className="module-note">
                <strong>Single-admin reality:</strong> {domain.singleAdminNote}
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
