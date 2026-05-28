import Link from "next/link";
import { departmentScopeForUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SopEscalationsPage({
  searchParams
}: {
  searchParams: { tab?: string };
}) {
  const user = await requirePermission("sop:escalation:resolve");
  const tab = (searchParams.tab ?? "open") as "open" | "mine" | "closed";

  const scope = user.userLevel === "ADMIN" ? {} : departmentScopeForUser(user);
  const where: Record<string, unknown> = {
    organizationId: user.organizationId,
    archivedAt: null,
    ...scope
  };
  if (tab === "open") {
    where.status = { in: ["OPEN", "ASSIGNED"] };
  } else if (tab === "mine") {
    where.routedToUserId = user.id;
    where.status = { in: ["OPEN", "ASSIGNED"] };
  } else if (tab === "closed") {
    where.status = { in: ["RESOLVED_ANSWERED", "RESOLVED_SOP_DRAFTED", "RESOLVED_NO_ACTION"] };
  }

  const escalations = await prisma.sopEscalation.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100
  });

  const queries = escalations.length
    ? await prisma.sopQuery.findMany({
        where: { organizationId: user.organizationId, id: { in: escalations.map((e) => e.queryId) } }
      })
    : [];
  const queryMap = new Map(queries.map((q) => [q.id, q]));

  const users = escalations.length
    ? await prisma.user.findMany({
        where: {
          organizationId: user.organizationId,
          id: { in: Array.from(new Set(escalations.map((e) => e.userId).concat(escalations.map((e) => e.routedToUserId ?? "")))).filter(Boolean) }
        },
        select: { id: true, firstName: true, lastName: true, email: true }
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const tabs = [
    { key: "open", label: "Open" },
    { key: "mine", label: "Mine" },
    { key: "closed", label: "Closed" }
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">SOP Knowledge Base · Escalations</p>
          <h1>Manager escalation inbox</h1>
          <p className="subhead">
            Questions that the AI assistant could not answer with confidence. Each one represents an
            employee that needs your guidance and a possible SOP gap.
          </p>
        </div>
      </div>

      <div className="tabs" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/sop/escalations?tab=${t.key}`}
            className={`button ${tab === t.key ? "primary" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {escalations.length === 0 ? (
        <div className="card card-pad">
          <p className="metric-note">No escalations in this view.</p>
        </div>
      ) : (
        <div className="grid">
          {escalations.map((e) => {
            const query = queryMap.get(e.queryId);
            const requester = userMap.get(e.userId);
            const routed = e.routedToUserId ? userMap.get(e.routedToUserId) : null;
            const triggers = (e.triggers ?? {}) as Record<string, boolean>;
            const activeTriggers = Object.entries(triggers)
              .filter(([, value]) => value)
              .map(([key]) => key.replace(/_/g, " "));

            return (
              <div key={e.id} className="card card-pad" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p className="eyebrow">
                      From: {requester ? `${requester.firstName} ${requester.lastName}` : e.userId}
                      {routed ? ` · Routed to ${routed.firstName} ${routed.lastName}` : ""}
                    </p>
                    <h2 style={{ marginTop: 4 }}>
                      {query?.questionRedacted.slice(0, 200) ?? "(question redacted)"}
                    </h2>
                  </div>
                  <span className={`pill ${e.status.startsWith("RESOLVED") ? "green" : "amber"}`}>
                    {e.status}
                  </span>
                </div>
                <p style={{ marginTop: 8 }}>{e.reasonSummary}</p>
                <p className="metric-note" style={{ marginTop: 4 }}>
                  Triggers: {activeTriggers.length ? activeTriggers.join(", ") : "(none)"}
                </p>
                <p className="metric-note">
                  Opened {new Date(e.createdAt).toLocaleString()}
                  {e.resolvedAt ? ` · Resolved ${new Date(e.resolvedAt).toLocaleString()}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
