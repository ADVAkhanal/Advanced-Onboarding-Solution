import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <section className="card empty-state">
      {Icon ? (
        <div className="empty-icon" aria-hidden="true">
          <Icon size={26} />
        </div>
      ) : null}
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </section>
  );
}
