import Link from "next/link";

const TABS = [
  { key: "overview", label: "Overview & Phases", href: "/blueprint" },
  { key: "modules", label: "Module Fit-Gap", href: "/blueprint/modules" },
  { key: "architecture", label: "Architecture", href: "/blueprint/architecture" },
  { key: "competitors", label: "Differentiation", href: "/blueprint/competitors" }
];

/** Shared tab strip across the Platform Blueprint pages. */
export function BlueprintSubnav({ active }: { active: string }) {
  return (
    <nav className="actions" aria-label="Blueprint sections" style={{ marginBottom: 14, flexWrap: "wrap" }}>
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
