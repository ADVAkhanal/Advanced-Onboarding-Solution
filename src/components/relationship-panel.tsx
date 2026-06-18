import Link from "next/link";
import type { AuthenticatedUser } from "@/lib/auth";
import { loadRelationships } from "@/lib/relationships";

/**
 * Reusable Relationship Panel. Drop onto any record detail page to show the
 * connected records (customer, orders, jobs, shipments, …) as deep-linked
 * cards. Async server component — resolves relationships server-side via
 * ordinary Prisma queries.
 */
export async function RelationshipPanel({
  user,
  entityType,
  entityId,
  title = "Related records"
}: {
  user: AuthenticatedUser;
  entityType: string;
  entityId: string;
  title?: string;
}) {
  const groups = await loadRelationships(user, entityType, entityId);
  if (!groups.length) return null;

  return (
    <section className="card" style={{ marginTop: 14 }}>
      <div className="section-title">
        <h2>{title}</h2>
      </div>
      <div className="card-pad rel-grid">
        {groups.map((g) => (
          <div key={g.key} className="rel-group">
            <div className="rel-label">{g.label}</div>
            {g.items.length ? (
              <ul className="rel-list">
                {g.items.map((it) => (
                  <li key={it.id}>
                    <Link href={it.href} className="rel-item">
                      <span className="rel-item-label">{it.label}</span>
                      {it.sublabel ? <span className="rel-item-sub">{it.sublabel}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="metric-note">None yet</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
