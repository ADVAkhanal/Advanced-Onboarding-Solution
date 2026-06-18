import Link from "next/link";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FORMS = [
  { href: "/proposal-request", title: "Request a proposal", blurb: "Capture a proposal opportunity." },
  { href: "/rfq-request", title: "Submit an RFQ", blurb: "Log a request for quote." },
  { href: "/contact-request", title: "Contact request", blurb: "Record a general customer inquiry." },
  { href: "/revision-request", title: "Revision request", blurb: "Capture a change to an existing quote or proposal." }
];

export default async function IntakeIndexPage() {
  await requirePermission("crm:view");
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Customer Intake</p>
          <h1>Intake forms</h1>
          <p className="subhead">
            Lightweight request capture. Every submission creates a local record first and is
            best-effort synced to Twenty CRM when configured — nothing is lost if the CRM is offline.
          </p>
        </div>
        <div className="actions">
          <Link className="button" href="/crm">CRM portal</Link>
        </div>
      </div>
      <div className="grid two-col">
        {FORMS.map((f) => (
          <Link key={f.href} href={f.href} className="card card-interactive" style={{ display: "block", textDecoration: "none" }}>
            <div className="card-pad">
              <h2 style={{ margin: 0 }}>{f.title}</h2>
              <p className="metric-note" style={{ marginTop: 6 }}>{f.blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
