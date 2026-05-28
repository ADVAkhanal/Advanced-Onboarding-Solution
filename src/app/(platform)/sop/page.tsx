import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SopAskClient } from "./ask-client";

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 10;

export default async function SopAskPage() {
  const user = await requirePermission("sop:ask");

  const [recent, approvedCount, escalationCount] = await Promise.all([
    prisma.sopQuery.findMany({
      where: { organizationId: user.organizationId, userId: user.id, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT
    }),
    prisma.sopDocumentVersion.count({
      where: { organizationId: user.organizationId, approvalStatus: "APPROVED", archivedAt: null }
    }),
    prisma.sopEscalation.count({
      where: {
        organizationId: user.organizationId,
        userId: user.id,
        status: { in: ["OPEN", "ASSIGNED"] },
        archivedAt: null
      }
    })
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">SOP Knowledge Base</p>
          <h1>Ask about a procedure</h1>
          <p className="subhead">
            The assistant answers only from approved internal SOPs and always shows its sources. Safety,
            quality, customer-impact, or unclear questions automatically route to a human manager.
          </p>
        </div>
      </div>

      <div className="grid three-col" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <p className="eyebrow">Approved SOPs in library</p>
          <h2>{approvedCount}</h2>
          <p className="metric-note">Only approved versions are searchable.</p>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Your open escalations</p>
          <h2>{escalationCount}</h2>
          <p className="metric-note">A manager is reviewing these.</p>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Your recent questions</p>
          <h2>{recent.length}</h2>
          <p className="metric-note">Last {RECENT_LIMIT} kept locally for you.</p>
        </div>
      </div>

      <SopAskClient />

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Your recent questions</h2>
        {recent.length === 0 ? (
          <p className="metric-note">No history yet — ask your first question above.</p>
        ) : (
          <ul className="compact-list">
            {recent.map((q) => (
              <li key={q.id}>
                <strong>{q.outcome}</strong> — {q.questionRedacted.slice(0, 140)}
                {q.questionRedacted.length > 140 ? "…" : ""}
                <span className="metric-note" style={{ marginLeft: 12 }}>
                  {new Date(q.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
