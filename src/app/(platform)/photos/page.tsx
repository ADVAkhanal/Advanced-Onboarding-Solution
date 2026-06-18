import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CompanyPhotosPage() {
  await requireUser();
  const url = (process.env.COMPANY_PHOTOS_URL || process.env.PHOTOS_URL || "").trim();
  if (url) {
    redirect(url);
  }
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Company</p>
          <h1>Company Photos</h1>
          <p className="subhead">
            The company photos library is not configured yet. Set <code>COMPANY_PHOTOS_URL</code> and
            this link will open it directly.
          </p>
        </div>
      </div>
      <section className="card">
        <div className="card-pad">
          <p className="metric-note">No external photo library is linked for this organization.</p>
        </div>
      </section>
    </>
  );
}
