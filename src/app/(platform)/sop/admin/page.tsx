import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SopAdminClient } from "./admin-client";

export const dynamic = "force-dynamic";

export default async function SopAdminPage() {
  const user = await requirePermission("sop:author");

  const [documents, versions, departments] = await Promise.all([
    prisma.sopDocument.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 200
    }),
    prisma.sopDocumentVersion.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: [{ documentId: "asc" }, { versionNumber: "desc" }]
    }),
    prisma.department.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      orderBy: { name: "asc" }
    })
  ]);

  const counts = {
    drafts: versions.filter((v) => v.approvalStatus === "DRAFT").length,
    inReview: versions.filter((v) => v.approvalStatus === "IN_REVIEW").length,
    approved: versions.filter((v) => v.approvalStatus === "APPROVED").length,
    superseded: versions.filter((v) => v.approvalStatus === "SUPERSEDED").length,
    rejected: versions.filter((v) => v.approvalStatus === "REJECTED").length
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">SOP Knowledge Base · Admin</p>
          <h1>SOP document library</h1>
          <p className="subhead">
            Only approved versions are retrievable by the assistant. Drafts and superseded versions are
            visible here, never in user search results.
          </p>
        </div>
      </div>

      <div className="grid four-col" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <p className="eyebrow">Drafts</p>
          <h2>{counts.drafts}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">In review</p>
          <h2>{counts.inReview}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Approved</p>
          <h2>{counts.approved}</h2>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Superseded · rejected</p>
          <h2>{counts.superseded + counts.rejected}</h2>
        </div>
      </div>

      <SopAdminClient
        documents={documents.map((d) => ({
          id: d.id,
          documentKey: d.documentKey,
          title: d.title,
          departmentId: d.departmentId,
          visibility: d.visibility,
          safetyCritical: d.safetyCritical,
          qualityCritical: d.qualityCritical,
          customerImpacting: d.customerImpacting,
          updatedAt: d.updatedAt.toISOString()
        }))}
        versions={versions.map((v) => ({
          id: v.id,
          documentId: v.documentId,
          versionNumber: v.versionNumber,
          approvalStatus: v.approvalStatus,
          changeSummary: v.changeSummary,
          createdAt: v.createdAt.toISOString(),
          approvedAt: v.approvedAt?.toISOString() ?? null
        }))}
        departments={departments.map((d) => ({ id: d.id, name: d.name, code: d.code }))}
        canApprove={user.permissions.includes("sop:approve")}
      />
    </>
  );
}
