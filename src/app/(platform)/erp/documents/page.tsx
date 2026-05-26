import { redirect } from "next/navigation";
import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await requirePermission("erp:view");
  if (user.userLevel === "USER") redirect("/erp/shop-floor");
  const refs = await getErpReferenceData(user);
  const documents = await prisma.documentRecord.findMany({
    where: { organizationId: user.organizationId, archivedAt: null, ...departmentScopeForUser(user) },
    orderBy: [{ updatedAt: "desc" }],
    take: 100
  });

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Document Metadata</p><h1>ERP Documents</h1><p className="subhead">Internal document records and revision metadata only. Do not upload or reference CUI, ITAR-controlled data, secrets, or regulated records.</p></div></div>
      <div className="grid two-col">
        <ErpCreateForm title="Add Document Record" endpoint="/api/erp/documents" fields={[
          { name: "title", label: "Title", required: true },
          { name: "documentType", label: "Document Type", required: true },
          { name: "revision", label: "Revision" },
          { name: "departmentId", label: "Department", type: "select", options: refs.departments.map((department) => ({ label: department.name, value: department.id })) },
          { name: "relatedType", label: "Related Type" },
          { name: "relatedId", label: "Related Record ID" },
          { name: "notes", label: "Notes", type: "textarea" }
        ]} />
        <section className="card"><div className="section-title"><h2>Document Boundary</h2><span className="pill red">No CUI</span></div><div className="card-pad"><ul className="compact-list"><li><span>Allowed</span><strong>Safe metadata</strong></li><li><span>Storage</span><strong>Metadata only</strong></li><li><span>Audit</span><strong>Create logged</strong></li></ul></div></section>
      </div>
      <section className="card" style={{ marginTop: 14 }}><div className="section-title"><h2>Document Records</h2><span className="pill">{documents.length}</span></div>{documents.length ? <table className="table"><thead><tr><th>Document</th><th>Title</th><th>Type</th><th>Revision</th><th>Status</th></tr></thead><tbody>{documents.map((document) => <tr key={document.id}><td>{document.documentNumber}</td><td>{document.title}</td><td>{document.documentType}</td><td>{document.revision ?? "Not set"}</td><td>{document.status}</td></tr>)}</tbody></table> : <div className="empty">No document records yet.</div>}</section>
    </>
  );
}
