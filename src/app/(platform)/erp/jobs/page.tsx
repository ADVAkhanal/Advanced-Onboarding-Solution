import Link from "next/link";
import { redirect } from "next/navigation";
import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { decimalText, formatShortDate, getErpReferenceData } from "@/lib/erp-data";
import { prisma } from "@/lib/prisma";
import { ErpCreateForm } from "@/components/erp-create-form";
import { OperationCompleteForm } from "./operation-complete-form";

const DONE_OP_STATUSES = ["COMPLETE", "COMPLETED", "DONE", "CANCELLED", "CLOSED"];

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const user = await requirePermission("erp:view");
  if (user.userLevel === "USER") redirect("/erp/shop-floor");
  const refs = await getErpReferenceData(user);
  const scope = departmentScopeForUser(user);
  const [jobs, operations] = await Promise.all([
    prisma.workOrder.findMany({ where: { organizationId: user.organizationId, archivedAt: null, ...scope }, orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }], take: 100 }),
    prisma.workOrderOperation.findMany({ where: { organizationId: user.organizationId, archivedAt: null, ...scope }, orderBy: [{ updatedAt: "desc" }], take: 100 })
  ]);

  const priorityOptions = ["LOW", "NORMAL", "HIGH", "URGENT", "WORK_STOPPAGE"].map((value) => ({ label: value.replaceAll("_", " "), value }));
  const departmentOptions = refs.departments.map((department) => ({ label: department.name, value: department.id }));
  const customerOptions = refs.customers.map((customer) => ({ label: customer.name, value: customer.id }));
  const partOptions = refs.parts.map((part) => ({ label: `${part.partNumber} Rev ${part.revision}`, value: part.id }));
  const salesOrderOptions = refs.salesOrders.map((order) => ({ label: order.orderNumber, value: order.id }));
  const jobOptions = jobs.map((job) => ({ label: `${job.workOrderNumber} · ${job.title}`, value: job.id }));

  const canManage = user.permissions.includes("erp:manage");
  const woNumberById = new Map(jobs.map((job) => [job.id, job.workOrderNumber]));
  const openOperationOptions = operations
    .filter((op) => !DONE_OP_STATUSES.includes((op.status ?? "").toUpperCase()))
    .map((op) => ({
      id: op.id,
      label: `${op.workOrderId ? woNumberById.get(op.workOrderId) ?? "WO" : "WO"} · op ${op.operationNumber} · ${op.workCenter}`
    }));

  return (
    <>
      <div className="page-head"><div><p className="eyebrow">Production Control</p><h1>Jobs & Work Orders</h1><p className="subhead">Work orders, routers, operation queues, material status, due dates, and shop accountability in one fast view.</p></div></div>
      <div className="grid two-col">
        <ErpCreateForm title="Create Work Order" endpoint="/api/erp/jobs" fields={[
          { name: "title", label: "Job Title", required: true },
          { name: "departmentId", label: "Department", type: "select", options: departmentOptions },
          { name: "customerId", label: "Customer", type: "select", options: customerOptions },
          { name: "partId", label: "Part", type: "select", options: partOptions },
          { name: "salesOrderId", label: "Sales Order", type: "select", options: salesOrderOptions },
          { name: "quantity", label: "Quantity", type: "number", defaultValue: 1 },
          { name: "dueDate", label: "Due Date", type: "date" },
          { name: "priority", label: "Priority", type: "select", defaultValue: "NORMAL", options: priorityOptions },
          { name: "notes", label: "Internal Notes", type: "textarea" }
        ]} />
        <ErpCreateForm title="Add Operation" endpoint="/api/erp/operations" fields={[
          { name: "workOrderId", label: "Work Order", type: "select", required: true, options: jobOptions },
          { name: "operationNumber", label: "Operation #", type: "number", required: true },
          { name: "workCenter", label: "Work Center", required: true },
          { name: "description", label: "Description", required: true },
          { name: "setupHours", label: "Setup Hours", type: "number" },
          { name: "runHours", label: "Run Hours", type: "number" },
          { name: "assignedToId", label: "Assigned To", type: "select", options: refs.users.map((teamUser) => ({ label: `${teamUser.firstName} ${teamUser.lastName}`, value: teamUser.id })) }
        ]} />
      </div>
      <div className="grid two-col" style={{ marginTop: 14 }}>
        <section className="card"><div className="section-title"><h2>Work Orders</h2><span className="pill">{jobs.length}</span></div>{jobs.length ? <table className="table"><thead><tr><th>WO</th><th>Title</th><th>Qty</th><th>Due</th><th>Status</th><th>Traveler</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td>{job.workOrderNumber}</td><td>{job.title}</td><td>{decimalText(job.quantity)}</td><td>{formatShortDate(job.dueDate)}</td><td>{job.status}</td><td><Link className="link" href={`/erp/jobs/${job.id}/print`}>PDF</Link></td></tr>)}</tbody></table> : <div className="empty">No work orders in your scope.</div>}</section>
        <section className="card"><div className="section-title"><h2>Operation Queue</h2><span className="pill">{operations.length}</span></div>{operations.length ? <table className="table"><thead><tr><th>Op</th><th>Work Center</th><th>Description</th><th>Status</th><th style={{ textAlign: "right" }}>Plan h</th><th style={{ textAlign: "right" }}>Actual h</th><th style={{ textAlign: "right" }}>Qty done</th></tr></thead><tbody>{operations.map((op) => <tr key={op.id}><td>{op.operationNumber}</td><td>{op.workCenter}</td><td>{op.description}</td><td>{DONE_OP_STATUSES.includes((op.status ?? "").toUpperCase()) ? <span className="pill green">{op.status}</span> : op.status}</td><td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{decimalText(op.runHours)}</td><td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{op.actualRunHours != null ? decimalText(op.actualRunHours) : "—"}</td><td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{op.completedQuantity != null ? decimalText(op.completedQuantity) : "—"}</td></tr>)}</tbody></table> : <div className="empty">No operations have been added yet.</div>}</section>
      </div>

      {canManage ? (
        <div className="grid two-col" style={{ marginTop: 14 }}>
          <OperationCompleteForm operations={openOperationOptions} />
        </div>
      ) : null}
    </>
  );
}
