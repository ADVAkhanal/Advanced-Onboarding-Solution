import Link from "next/link";
import { redirect } from "next/navigation";
import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { formatShortDate, getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";

export const dynamic = "force-dynamic";

export default async function QualityPage() {
  const user = await requirePermission("erp:view");
  if (user.userLevel === "USER") redirect("/erp/shop-floor");
  const refs = await getErpReferenceData(user);
  const scope = departmentScopeForUser(user);
  const [inspections, ncrs] = await Promise.all([
    prisma.qualityInspection.findMany({ where: { organizationId: user.organizationId, archivedAt: null, ...scope }, orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }], take: 100 }),
    prisma.nonconformanceRecord.findMany({ where: { organizationId: user.organizationId, archivedAt: null, ...scope }, orderBy: [{ updatedAt: "desc" }], take: 100 })
  ]);
  const departmentOptions = refs.departments.map((department) => ({ label: department.name, value: department.id }));
  const jobOptions = refs.workOrders.map((job) => ({ label: `${job.workOrderNumber} · ${job.title}`, value: job.id }));
  const partOptions = refs.parts.map((part) => ({ label: `${part.partNumber} Rev ${part.revision}`, value: part.id }));

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Quality Coordination</p><h1>Quality & NCRs</h1><p className="subhead">Inspection queues and nonconformance coordination for internal production control. This is not a formal compliance evidence system.</p></div><div className="actions"><Link className="button" href="/erp/first-piece">First-Piece Tracker</Link></div></div>
      <div className="grid two-col">
        <ErpCreateForm title="Create Inspection" endpoint="/api/erp/quality" fields={[
          { name: "workOrderId", label: "Work Order", type: "select", options: jobOptions },
          { name: "partId", label: "Part", type: "select", options: partOptions },
          { name: "departmentId", label: "Department", type: "select", options: departmentOptions },
          { name: "inspectionType", label: "Inspection Type", required: true },
          { name: "dueDate", label: "Due Date", type: "date" },
          { name: "priority", label: "Priority", type: "select", defaultValue: "NORMAL", options: ["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => ({ label: value, value })) },
          { name: "notes", label: "Inspection Notes", type: "textarea" }
        ]} />
        <ErpCreateForm title="Create NCR" endpoint="/api/erp/nonconformance" fields={[
          { name: "title", label: "NCR Title", required: true },
          { name: "workOrderId", label: "Work Order", type: "select", options: jobOptions },
          { name: "partId", label: "Part", type: "select", options: partOptions },
          { name: "departmentId", label: "Department", type: "select", options: departmentOptions },
          { name: "severity", label: "Severity", type: "select", defaultValue: "MEDIUM", options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => ({ label: value, value })) },
          { name: "disposition", label: "Disposition" },
          { name: "notes", label: "Internal Notes", type: "textarea" }
        ]} />
      </div>
      <div className="grid two-col" style={{ marginTop: 14 }}>
        <section className="card"><div className="section-title"><h2>Inspections</h2><span className="pill">{inspections.length}</span></div>{inspections.length ? <table className="table"><thead><tr><th>ID</th><th>Type</th><th>Due</th><th>Result</th><th>Status</th></tr></thead><tbody>{inspections.map((inspection) => <tr key={inspection.id}><td>{inspection.inspectionNumber}</td><td>{inspection.inspectionType}</td><td>{formatShortDate(inspection.dueDate)}</td><td>{inspection.result ?? "Pending"}</td><td>{inspection.status}</td></tr>)}</tbody></table> : <div className="empty">No inspections queued.</div>}</section>
        <section className="card"><div className="section-title"><h2>Nonconformance Records</h2><span className="pill">{ncrs.length}</span></div>{ncrs.length ? <table className="table"><thead><tr><th>NCR</th><th>Title</th><th>Severity</th><th>Disposition</th><th>Status</th></tr></thead><tbody>{ncrs.map((ncr) => <tr key={ncr.id}><td>{ncr.ncrNumber}</td><td>{ncr.title}</td><td>{ncr.severity}</td><td>{ncr.disposition ?? "TBD"}</td><td>{ncr.status}</td></tr>)}</tbody></table> : <div className="empty">No NCRs recorded.</div>}</section>
      </div>
    </>
  );
}
