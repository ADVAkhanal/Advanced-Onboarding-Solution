import { NextResponse } from "next/server";
import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { recordNumber } from "@/lib/numbering";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const openStatuses = ["New", "Assigned", "In Progress", "Waiting on Requester", "Waiting on Manager", "Blocked", "Escalated", "Reopened"];

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await requirePermission("report:export");
  const departmentScope = departmentScopeForUser(user);
  const tickets = await prisma.ticket.findMany({
    where: {
      organizationId: user.organizationId,
      archivedAt: null,
      status: { in: openStatuses },
      ...departmentScope
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: 1000
  });

  const report = await prisma.report.create({
    data: {
      organizationId: user.organizationId,
      reportNumber: recordNumber("RPT"),
      reportType: "Open Tickets Report",
      title: "Open Tickets CSV Export",
      generatedById: user.id,
      summaryMetrics: { rowCount: tickets.length, format: "CSV" },
      status: "Generated",
      createdById: user.id,
      updatedById: user.id,
      ownerId: user.id
    }
  });

  const exportRecord = await prisma.reportExport.create({
    data: {
      organizationId: user.organizationId,
      reportId: report.id,
      format: "CSV",
      exportedById: user.id,
      status: "Exported",
      createdById: user.id,
      ownerId: user.id
    }
  });

  await recordAudit({
    organizationId: user.organizationId,
    actorId: user.id,
    action: "report.export_csv",
    entityType: "report",
    entityId: report.id,
    ownerId: user.id,
    after: { reportId: report.id, exportId: exportRecord.id, rows: tickets.length }
  });

  const header = ["ticketNumber", "title", "departmentId", "priority", "status", "ownerId", "dueDate"];
  const rows = tickets.map((ticket) => [
    ticket.ticketNumber,
    ticket.title,
    ticket.departmentId,
    ticket.priority,
    ticket.status,
    ticket.ownerId ?? "",
    ticket.dueDate?.toISOString() ?? ""
  ]);
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="open-tickets-${report.reportNumber}.csv"`
    }
  });
}
