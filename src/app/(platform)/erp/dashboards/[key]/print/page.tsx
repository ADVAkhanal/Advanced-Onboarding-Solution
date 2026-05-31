import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { DashboardRender } from "@/components/dashboard-render";
import { PrintButton } from "@/components/print-button";
import { getDashboard } from "@/lib/dashboards/registry";

export const dynamic = "force-dynamic";

export default async function DashboardPrintPage({ params }: { params: { key: string } }) {
  const def = getDashboard(params.key);
  if (!def) {
    notFound();
  }

  const user = await requirePermission(def.permission);
  const organization = await import("@/lib/prisma").then((m) =>
    m.prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { name: true, legalName: true, brandName: true }
    })
  );
  const company =
    organization?.brandName || organization?.legalName || organization?.name || "Advanced PMC";

  const data = await def.load({ organizationId: user.organizationId, user });
  const generatedAt = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date());

  return (
    <>
      <div className="print-toolbar no-print">
        <Link className="button" href={`/erp/dashboards/${def.key}`}>
          ← Back
        </Link>
        <PrintButton />
      </div>

      <article className="print-document">
        <header className="print-doc-header">
          <div className="print-doc-brand">
            <strong>{company}</strong>
            <span>{def.title}</span>
          </div>
          <div className="print-doc-meta">
            <div className="doc-title">{def.title}</div>
            <div>Generated: {generatedAt}</div>
          </div>
        </header>

        <DashboardRender data={data} />

        <footer className="print-doc-footer" style={{ marginTop: 22 }}>
          <p>
            {company} · {def.title} · Generated {generatedAt}. Operational metadata only — no
            controlled or customer-identifying technical data.
          </p>
        </footer>
      </article>
    </>
  );
}
