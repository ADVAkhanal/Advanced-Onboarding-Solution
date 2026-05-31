import { DataTable, type Column } from "@/components/data-table";
import type {
  BarWidget,
  DashboardData,
  DonutWidget,
  GanttWidget,
  Kpi,
  TableWidget,
  Tone,
  Widget
} from "@/lib/dashboards/types";

const TONE_COLOR: Record<Tone, string> = {
  blue: "#006ef5",
  green: "#15a85b",
  amber: "#f59e0b",
  red: "#ef2d2d",
  cyan: "#00b7ff"
};

function toneValueClass(tone?: Tone): string {
  if (tone === "green") return "tone-green";
  if (tone === "amber") return "tone-amber";
  if (tone === "red") return "tone-red";
  return "";
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  return (
    <section className="card kpi">
      <div className="metric-label">{kpi.label}</div>
      <div>
        <div className={`metric-value ${toneValueClass(kpi.tone)}`}>{kpi.value}</div>
        {kpi.note ? <div className="metric-note">{kpi.note}</div> : null}
      </div>
    </section>
  );
}

function BarBlock({ widget }: { widget: BarWidget }) {
  const max = Math.max(1, ...widget.items.map((i) => i.max ?? i.value));
  const fmt = (n: number) =>
    widget.unit === "$" ? new Intl.NumberFormat("en-US").format(n) : `${n}${widget.unit ?? ""}`;
  return (
    <section className="card">
      <div className="section-title">
        <h2>{widget.title}</h2>
      </div>
      <div className="card-pad">
        {widget.items.length === 0 ? (
          <div className="empty">No data.</div>
        ) : (
          <div className="bar-list">
            {widget.items.map((item, i) => {
              const pct = Math.min(100, Math.round(((item.value || 0) / max) * 100));
              return (
                <div className="bar-row" key={`${item.label}-${i}`}>
                  <span title={item.hint}>{item.label}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: TONE_COLOR[item.tone ?? "blue"]
                      }}
                    />
                  </span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {widget.unit === "$" ? "$" : ""}
                    {fmt(item.value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function DonutBlock({ widget }: { widget: DonutWidget }) {
  const total = widget.segments.reduce((a, s) => a + s.value, 0);
  let acc = 0;
  const stops = widget.segments
    .map((s) => {
      const start = total > 0 ? (acc / total) * 100 : 0;
      acc += s.value;
      const end = total > 0 ? (acc / total) * 100 : 0;
      return `${TONE_COLOR[s.tone ?? "blue"]} ${start}% ${end}%`;
    })
    .join(", ");
  return (
    <section className="card">
      <div className="section-title">
        <h2>{widget.title}</h2>
      </div>
      <div className="card-pad">
        {total === 0 ? (
          <div className="empty">No data.</div>
        ) : (
          <>
            <div
              className="donut"
              style={{ background: `conic-gradient(${stops})` }}
              role="img"
              aria-label={widget.segments.map((s) => `${s.label}: ${s.value}`).join(", ")}
            >
              <div className="donut-inner">{widget.centerLabel ?? total}</div>
            </div>
            <ul className="compact-list" style={{ marginTop: 12 }}>
              {widget.segments.map((s, i) => (
                <li key={`${s.label}-${i}`}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: TONE_COLOR[s.tone ?? "blue"]
                      }}
                    />
                    {s.label}
                  </span>
                  <strong>{s.value}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function TableBlock({ widget }: { widget: TableWidget }) {
  const columns: Column<Record<string, string | number>>[] = widget.columns.map((c) => ({
    key: c.key,
    header: c.label,
    numeric: c.numeric,
    render: (row) => row[c.key]
  }));
  return (
    <section className="card">
      <div className="section-title">
        <h2>{widget.title}</h2>
        <span className="pill">{widget.rows.length}</span>
      </div>
      <div style={{ padding: "0 4px 4px" }}>
        <DataTable
          columns={columns}
          rows={widget.rows}
          rowKey={(_row, index) => `${widget.id}-${index}`}
          caption={widget.title}
          emptyLabel={widget.emptyLabel ?? "No data."}
          stickyHeader={widget.rows.length > 12}
        />
      </div>
    </section>
  );
}

function GanttBlock({ widget }: { widget: GanttWidget }) {
  const span = Math.max(1, widget.windowEndMs - widget.windowStartMs);
  return (
    <section className="card">
      <div className="section-title">
        <h2>{widget.title}</h2>
        <span className="pill">{widget.rows.length}</span>
      </div>
      <div className="card-pad">
        {widget.rows.length === 0 ? (
          <div className="empty">No scheduled work in this window.</div>
        ) : (
          <div className="gantt">
            <div className="gantt-axis">
              {widget.ticks.map((t, i) => (
                <span key={`${t}-${i}`}>{t}</span>
              ))}
            </div>
            {widget.rows.map((row, i) => {
              const left = Math.max(0, Math.min(100, ((row.startMs - widget.windowStartMs) / span) * 100));
              const rawWidth = ((row.endMs - row.startMs) / span) * 100;
              const width = Math.max(1.5, Math.min(100 - left, rawWidth));
              return (
                <div className="gantt-row" key={`${row.label}-${i}`}>
                  <span className="gantt-label" title={row.sublabel}>
                    {row.label}
                  </span>
                  <span className="gantt-track">
                    <span
                      className="gantt-bar"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: TONE_COLOR[row.tone ?? "blue"]
                      }}
                      title={row.sublabel}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function WidgetBlock({ widget }: { widget: Widget }) {
  switch (widget.kind) {
    case "bar":
      return <BarBlock widget={widget} />;
    case "donut":
      return <DonutBlock widget={widget} />;
    case "table":
      return <TableBlock widget={widget} />;
    case "gantt":
      return <GanttBlock widget={widget} />;
    default:
      return null;
  }
}

export function DashboardRender({ data }: { data: DashboardData }) {
  return (
    <>
      {data.note ? (
        <div className="module-note" style={{ marginBottom: 14 }}>
          {data.note}
        </div>
      ) : null}
      {data.kpis.length > 0 ? (
        <div className="grid four-col" style={{ marginBottom: 14 }}>
          {data.kpis.map((kpi, i) => (
            <KpiTile key={`${kpi.label}-${i}`} kpi={kpi} />
          ))}
        </div>
      ) : null}
      <div className="grid" style={{ gap: 14 }}>
        {data.widgets.map((widget) => (
          <WidgetBlock key={widget.id} widget={widget} />
        ))}
      </div>
    </>
  );
}
