import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "blue"
}: {
  label: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const toneClass = tone === "green" ? "tone-green" : tone === "amber" ? "tone-amber" : tone === "red" ? "tone-red" : "";

  return (
    <section className="card kpi">
      <div className="kpi-top">
        <div className="metric-label">{label}</div>
        <div className={`icon-disc ${toneClass}`}>
          <Icon size={21} />
        </div>
      </div>
      <div>
        <div className={`metric-value ${toneClass}`}>{value}</div>
        <div className="metric-note">{note}</div>
      </div>
    </section>
  );
}
