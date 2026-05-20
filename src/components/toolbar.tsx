import type { ReactNode } from "react";

export function Toolbar({
  label,
  children,
  align = "left"
}: {
  label?: string;
  children: ReactNode;
  align?: "left" | "right" | "between";
}) {
  return (
    <div className={`toolbar toolbar-${align}`}>
      {label ? <span className="tb-label">{label}</span> : null}
      {children}
    </div>
  );
}

export function ToolbarButton({
  active,
  onClick,
  children,
  ariaLabel
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`tb-btn${active ? " active" : ""}`}
      onClick={onClick}
      aria-pressed={active ? "true" : "false"}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
