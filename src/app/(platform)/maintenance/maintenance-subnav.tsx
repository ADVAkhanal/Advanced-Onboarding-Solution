import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview", href: "/maintenance" },
  { key: "machines", label: "Machines", href: "/maintenance/machines" },
  { key: "work-orders", label: "Work Orders", href: "/maintenance/work-orders" },
  { key: "pm", label: "PM Schedule", href: "/maintenance/pm" },
  { key: "parts", label: "MRO Parts", href: "/maintenance/parts" },
  { key: "downtime", label: "Downtime", href: "/maintenance/downtime" }
];

/** Shared tab strip across the Maintenance pages. Reuses the .button primitive. */
export function MaintenanceSubnav({ active }: { active: string }) {
  return (
    <nav className="actions" aria-label="Maintenance sections" style={{ marginBottom: 14, flexWrap: "wrap" }}>
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`button${tab.key === active ? " primary" : ""}`}
          aria-current={tab.key === active ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
