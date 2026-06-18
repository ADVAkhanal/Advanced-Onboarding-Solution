import Link from "next/link";
import { ErpCreateForm } from "@/components/erp-create-form";

/**
 * Shared intake form for the lightweight request routes (proposal / RFQ /
 * contact / revision). Each creates a local CrmRequest first via the existing
 * /api/integrations/crm/request endpoint, which then best-effort-syncs to
 * Twenty CRM if configured. One component, four pre-typed entry points — no
 * duplicate intake pipelines.
 */

const INTAKE = {
  proposal: {
    eyebrow: "Intake · Proposal",
    title: "Request a proposal",
    blurb: "Capture a proposal request. It is recorded locally and synced to Twenty CRM when configured."
  },
  rfq: {
    eyebrow: "Intake · RFQ",
    title: "Submit an RFQ",
    blurb: "Log a request for quote. Sales picks it up from the CRM portal; nothing is lost if CRM is offline."
  },
  contact: {
    eyebrow: "Intake · Contact",
    title: "Contact request",
    blurb: "Record a general customer inquiry for routing and follow-up."
  },
  revision: {
    eyebrow: "Intake · Revision",
    title: "Revision request",
    blurb: "Capture a revision to an existing quote or proposal."
  }
} as const;

export type IntakeType = keyof typeof INTAKE;

const TYPE_OPTIONS = [
  { label: "Proposal", value: "proposal" },
  { label: "RFQ", value: "rfq" },
  { label: "Contact", value: "contact" },
  { label: "Revision", value: "revision" },
  { label: "Customer", value: "customer" }
];

export function IntakeFormSection({ type }: { type: IntakeType }) {
  const cfg = INTAKE[type];
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{cfg.eyebrow}</p>
          <h1>{cfg.title}</h1>
          <p className="subhead">{cfg.blurb}</p>
        </div>
        <div className="actions">
          <Link className="button" href="/intake">All intake forms</Link>
          <Link className="button" href="/crm">CRM portal</Link>
        </div>
      </div>

      <ErpCreateForm
        title={cfg.title}
        endpoint="/api/integrations/crm/request"
        fields={[
          { name: "requestType", label: "Type", type: "select", defaultValue: type, options: TYPE_OPTIONS },
          { name: "contactName", label: "Contact name", required: true },
          { name: "companyName", label: "Company" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone", type: "tel" },
          { name: "title", label: "Request title", required: true },
          { name: "estValue", label: "Estimated value ($)", type: "number" },
          { name: "summary", label: "Details", type: "textarea" }
        ]}
      />
    </>
  );
}
