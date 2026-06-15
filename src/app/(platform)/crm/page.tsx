import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";
import { fmtDate } from "@/lib/maintenance";
import { isPapermarkConfigured } from "@/lib/integrations/papermark";
import { isTwentyConfigured } from "@/lib/integrations/twenty";

export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["NEW", "SENT_TO_CRM", "PROPOSAL_SHARED"];

function statusPill(status: string): string {
  if (status === "WON") return "green";
  if (status === "LOST") return "red";
  if (status === "PROPOSAL_SHARED" || status === "SENT_TO_CRM") return "amber";
  return "";
}

export default async function CrmPortalPage() {
  const user = await requirePermission("crm:view");
  const canManage = user.permissions.includes("crm:manage");
  const twentyOn = isTwentyConfigured();
  const papermarkOn = isPapermarkConfigured();

  const requests = await prisma.crmRequest.findMany({
    where: { organizationId: user.organizationId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    take: 300
  });

  const open = requests.filter((r) => OPEN_STATUSES.includes(r.status)).length;
  const sent = requests.filter((r) => r.twentyPersonId || r.status === "SENT_TO_CRM").length;
  const shared = requests.filter((r) => r.status === "PROPOSAL_SHARED" || r.papermarkLinkId).length;
  const totalViews = requests.reduce((s, r) => s + r.proposalViews, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">CRM · Internal Portal</p>
          <h1>CRM Portal</h1>
          <p className="subhead">
            Capture customer and proposal requests, push them to Twenty CRM, share proposals via
            Papermark, and track activity, proposal views, and status. Local records are authoritative —
            a CRM outage never loses a capture.
          </p>
        </div>
        <div className="actions">
          <a className="button" href={process.env.CRM_URL || "https://crm.yourdomain.com"} target="_blank" rel="noopener noreferrer">Open CRM ↗</a>
          <Link className="button" href="/erp/dashboards">Dashboards</Link>
        </div>
      </div>

      <div className="module-note" style={{ marginBottom: 14 }}>
        <strong>Integrations:</strong>{" "}
        <span className={`pill ${twentyOn ? "green" : ""}`}>Twenty CRM {twentyOn ? "connected" : "not configured"}</span>{" "}
        <span className={`pill ${papermarkOn ? "green" : ""}`}>Papermark {papermarkOn ? "connected" : "not configured"}</span>
        {!twentyOn ? " — requests are captured locally; set TWENTY_API_URL + TWENTY_API_KEY to push to CRM." : ""}
      </div>

      <div className="grid four-col" style={{ marginBottom: 14 }}>
        <section className="card kpi">
          <div className="metric-label">Open requests</div>
          <div><div className="metric-value">{open}</div><div className="metric-note">{requests.length} total</div></div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Sent to CRM</div>
          <div><div className={`metric-value ${sent > 0 ? "tone-green" : ""}`}>{sent}</div><div className="metric-note">{twentyOn ? "pushed to Twenty" : "Twenty off"}</div></div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Proposals shared</div>
          <div><div className="metric-value">{shared}</div><div className="metric-note">via Papermark</div></div>
        </section>
        <section className="card kpi">
          <div className="metric-label">Proposal views</div>
          <div><div className="metric-value">{totalViews}</div><div className="metric-note">across shared links</div></div>
        </section>
      </div>

      {canManage ? (
        <div style={{ marginBottom: 14 }}>
          <ErpCreateForm
            title="New customer / proposal request"
            endpoint="/api/integrations/crm/request"
            fields={[
              { name: "requestType", label: "Type", type: "select", options: [{ label: "Customer", value: "customer" }, { label: "Proposal", value: "proposal" }], defaultValue: "customer" },
              { name: "contactName", label: "Contact name", required: true },
              { name: "companyName", label: "Company" },
              { name: "email", label: "Email", type: "email" },
              { name: "phone", label: "Phone", type: "tel" },
              { name: "title", label: "Request / proposal title", required: true },
              { name: "estValue", label: "Estimated value ($)", type: "number" },
              { name: "summary", label: "Summary", type: "textarea" }
            ]}
          />
        </div>
      ) : null}

      <section className="card">
        <div className="section-title">
          <h2>Requests &amp; activity</h2>
          <span className="pill">{requests.length}</span>
        </div>
        {requests.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Contact</th>
                <th>Company</th>
                <th>Title</th>
                <th>Status</th>
                <th>CRM</th>
                <th style={{ textAlign: "right" }}>Views</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.requestType}</td>
                  <td>{r.contactName}</td>
                  <td>{r.companyName ?? "—"}</td>
                  <td>{r.title}</td>
                  <td><span className={`pill ${statusPill(r.status)}`}>{r.status.replaceAll("_", " ")}</span></td>
                  <td>
                    {r.twentyPersonId ? <span className="pill green">synced</span> : r.syncError ? <span className="pill red" title={r.syncError}>error</span> : <span className="pill">local</span>}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.proposalViews || "—"}</td>
                  <td>{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No requests yet. Capture the first one above.</div>
        )}
      </section>
    </>
  );
}
