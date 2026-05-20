import type { ReactNode } from "react";

export function PageHead({
  eyebrow,
  title,
  subhead,
  actions
}: {
  eyebrow?: string;
  title: string;
  subhead?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subhead ? <p className="subhead">{subhead}</p> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}
