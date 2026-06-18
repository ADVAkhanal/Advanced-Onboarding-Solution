import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DocumentPortalPage() {
  await requireUser();
  const url = (process.env.DOCUMENT_PORTAL_URL || process.env.DOCS_PORTAL_URL || "").trim();
  if (url) {
    redirect(url);
  }
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Documents</p>
          <h1>Document Portal</h1>
          <p className="subhead">
            The external document portal is not configured yet. Set <code>DOCUMENT_PORTAL_URL</code>{" "}
            (e.g. a Paperless-ngx instance) and this link will open it directly.
          </p>
        </div>
      </div>
      <section className="card">
        <div className="card-pad">
          <p className="metric-note">
            Until then, ERP documents are available under{" "}
            <a className="link" href="/erp/documents">ERP · Documents</a>.
          </p>
        </div>
      </section>
    </>
  );
}
