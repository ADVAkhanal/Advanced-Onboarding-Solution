import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { ALLOWED_DOCTYPES, erpnextConfig, erpnextPing, isErpNextConfigured } from "@/lib/erpnext/client";

export const dynamic = "force-dynamic";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default async function ErpNextIntegrationPage() {
  await requirePermission("admin:manage");

  const cfg = erpnextConfig();
  const configured = isErpNextConfigured();
  const ping = configured ? await erpnextPing() : null;
  const connected = Boolean(ping && ping.error === null && ping.data);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Integrations · ERPNext</p>
          <h1>ERPNext Bridge</h1>
          <p className="subhead">
            Decoupled, read-only bridge to a forked, pinned ERPNext (Frappe) backend. ERPNext owns
            the core ERP domain; Shop-Management is the experience layer. The bridge carries only
            operational doctypes — never accounting, payroll, banking, or PII.
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/erp/integrations/proshop">ProShop integration</Link>
        </div>
      </div>

      <div className="grid four-col">
        <section className="card kpi">
          <div className="metric-label">Configuration</div>
          <div>
            <div className={`metric-value ${configured ? "tone-green" : "tone-amber"}`}>{configured ? "Set" : "Not set"}</div>
            <div className="metric-note">{configured ? "ERPNEXT_* present" : "Set ERPNEXT_BASE_URL + API key/secret"}</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Connection</div>
          <div>
            <div className={`metric-value ${connected ? "tone-green" : configured ? "tone-red" : ""}`} style={{ fontSize: 18 }}>
              {configured ? (connected ? "Connected" : "Unreachable") : "—"}
            </div>
            <div className="metric-note">{configured && ping?.data ? `as ${ping.data}` : configured ? ping?.error ?? "No response" : "Awaiting config"}</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Host</div>
          <div>
            <div className="metric-value" style={{ fontSize: 16 }}>{cfg ? hostOf(cfg.baseUrl) : "—"}</div>
            <div className="metric-note">ERPNEXT_BASE_URL</div>
          </div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Bridgeable doctypes</div>
          <div>
            <div className="metric-value">{ALLOWED_DOCTYPES.size}</div>
            <div className="metric-note">Operational allowlist</div>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title">
          <h2>Operational scope (enforced in code)</h2>
          <span className="pill green">Allowlist</span>
        </div>
        <div className="card-pad">
          <div className="module-note" style={{ marginBottom: 12 }}>
            Only these ERPNext doctypes can be read through the bridge. Requests for accounting,
            payroll, banking, or PII doctypes are rejected by <code>src/lib/erpnext/client.ts</code> —
            the data-scope boundary is a code guard, not a convention.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...ALLOWED_DOCTYPES].map((d) => (
              <span className="pill" key={d}>{d}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="section-title">
          <h2>Setup</h2>
        </div>
        <div className="card-pad">
          <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
            <li>Fork &amp; run ERPNext (Docker, Linux host) — see <code>erpnext-integration/README.md</code>.</li>
            <li>In ERPNext: create an API Key + Secret for a least-privilege integration user.</li>
            <li>
              Set <code>ERPNEXT_BASE_URL</code>, <code>ERPNEXT_API_KEY</code>, <code>ERPNEXT_API_SECRET</code> in this
              app&apos;s environment (Railway). Leave blank to keep the bridge disabled.
            </li>
            <li>Reload this page — Connection flips to <strong>Connected</strong>.</li>
          </ol>
          <p className="metric-note" style={{ marginTop: 10 }}>
            Architecture, data-model mapping, and the migration plan: <code>docs/erpnext-integration.md</code>.
          </p>
        </div>
      </section>
    </>
  );
}
