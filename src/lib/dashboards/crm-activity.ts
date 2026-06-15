import { prisma } from "@/lib/prisma";
import type { DashboardContext, DashboardData, DonutSegment, Tone } from "./types";

const OPEN_STATUSES = ["NEW", "SENT_TO_CRM", "PROPOSAL_SHARED"];
const STATUS_ORDER = ["NEW", "SENT_TO_CRM", "PROPOSAL_SHARED", "WON", "LOST"];

function statusTone(status: string): Tone {
  if (status === "WON") return "green";
  if (status === "LOST") return "red";
  if (status === "PROPOSAL_SHARED" || status === "SENT_TO_CRM") return "amber";
  return "blue";
}

function fmtDate(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d) : "—";
}

/**
 * CRM Activity — pipeline of captured customer/proposal requests, their CRM
 * sync state, and Papermark proposal engagement (views/downloads). Reads only
 * the local CrmRequest table (operational metadata), so it stays inside the
 * platform data-scope boundary even when Twenty/Papermark are connected.
 */
export async function loadCrmActivity(ctx: DashboardContext): Promise<DashboardData> {
  const where = { organizationId: ctx.organizationId, archivedAt: null };

  const [statusGroups, typeGroups, requests, engaged] = await Promise.all([
    prisma.crmRequest.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.crmRequest.groupBy({ by: ["requestType"], where, _count: { _all: true } }),
    prisma.crmRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        contactName: true, companyName: true, requestType: true, status: true,
        proposalViews: true, twentyPersonId: true, syncError: true, createdAt: true
      }
    }),
    prisma.crmRequest.findMany({
      where: { ...where, papermarkLinkId: { not: null } },
      orderBy: { proposalViews: "desc" },
      take: 10,
      select: { title: true, companyName: true, proposalViews: true, proposalDownloads: true, lastViewedAt: true }
    })
  ]);

  const countByStatus = new Map(statusGroups.map((g) => [g.status, g._count._all]));
  const total = statusGroups.reduce((s, g) => s + g._count._all, 0);
  const won = countByStatus.get("WON") ?? 0;
  const lost = countByStatus.get("LOST") ?? 0;
  const decided = won + lost;
  const winRate = decided > 0 ? Math.round((won / decided) * 100) : null;
  const open = OPEN_STATUSES.reduce((s, st) => s + (countByStatus.get(st) ?? 0), 0);
  const shared = (countByStatus.get("PROPOSAL_SHARED") ?? 0);

  const totalViews = engaged.reduce((s, r) => s + r.proposalViews, 0);
  const totalDownloads = engaged.reduce((s, r) => s + r.proposalDownloads, 0);

  const donutSegments: DonutSegment[] = STATUS_ORDER.filter((s) => (countByStatus.get(s) ?? 0) > 0).map(
    (s) => ({ label: `${s.replaceAll("_", " ")} (${countByStatus.get(s)})`, value: countByStatus.get(s) ?? 0, tone: statusTone(s) })
  );

  return {
    kpis: [
      { label: "Open requests", value: open, note: `${total} total`, tone: "blue" },
      {
        label: "Win rate",
        value: winRate === null ? "—" : `${winRate}%`,
        note: winRate === null ? "No decided requests" : `${won} won · ${lost} lost`,
        tone: winRate !== null && winRate >= 50 ? "green" : "amber"
      },
      { label: "Proposals shared", value: shared, note: "via Papermark", tone: "cyan" },
      {
        label: "Proposal views",
        value: totalViews,
        note: `${totalDownloads} downloads`,
        tone: totalViews > 0 ? "green" : "blue"
      }
    ],
    widgets: [
      {
        kind: "donut",
        id: "by-status",
        title: "Requests by status",
        centerLabel: `${total} total`,
        segments: donutSegments
      },
      {
        kind: "bar",
        id: "by-type",
        title: "Requests by type",
        items: typeGroups.map((g) => ({ label: g.requestType, value: g._count._all, tone: "blue" }))
      },
      {
        kind: "bar",
        id: "top-proposals",
        title: "Top proposals by views",
        items: engaged
          .filter((r) => r.proposalViews > 0)
          .slice(0, 8)
          .map((r) => ({ label: r.title, value: r.proposalViews, tone: "cyan" }))
      },
      {
        kind: "table",
        id: "proposal-engagement",
        title: "Proposal engagement",
        columns: [
          { key: "title", label: "Proposal" },
          { key: "company", label: "Company" },
          { key: "views", label: "Views", numeric: true },
          { key: "downloads", label: "Downloads", numeric: true },
          { key: "lastViewed", label: "Last viewed" }
        ],
        rows: engaged.map((r) => ({
          title: r.title,
          company: r.companyName ?? "—",
          views: r.proposalViews,
          downloads: r.proposalDownloads,
          lastViewed: fmtDate(r.lastViewedAt)
        })),
        emptyLabel: "No proposals shared yet."
      },
      {
        kind: "table",
        id: "recent-requests",
        title: "Recent requests",
        columns: [
          { key: "contact", label: "Contact" },
          { key: "company", label: "Company" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "crm", label: "CRM" },
          { key: "views", label: "Views", numeric: true },
          { key: "created", label: "Created" }
        ],
        rows: requests.map((r) => ({
          contact: r.contactName,
          company: r.companyName ?? "—",
          type: r.requestType,
          status: r.status.replaceAll("_", " "),
          crm: r.twentyPersonId ? "synced" : r.syncError ? "error" : "local",
          views: r.proposalViews,
          created: fmtDate(r.createdAt)
        })),
        emptyLabel: "No requests captured yet."
      }
    ]
  };
}
