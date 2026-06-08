import { DataTable, type Column } from "@/components/data-table";
import type {
  BarWidget,
  DashboardData,
  DonutWidget,
  GanttWidget,
  HeatmapWidget,
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

/** Tint a tone color for heatmap cell backgrounds (kept subtle; the cell's
 *  number is always the primary signal, so contrast never relies on color). */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

function HeatmapBlock({ widget }: { widget: HeatmapWidget }) {
  return (
    <section className="card">
      <div className="section-title">
        <h2>{widget.title}</h2>
        <span className="pill">{widget.rows.length}</span>
      </div>
      <div className="card-pad">
        {widget.rows.length === 0 ? (
          <div className="empty">{widget.emptyLabel ?? "No data."}</div>
        ) : (
          <>
            <div className="heatmap-scroll">
              <table className="heatmap">
                <thead>
                  <tr>
                    <th scope="col" className="heatmap-rowhead">
                      {widget.rowHeader ?? ""}
                    </th>
                    {widget.columns.map((c, i) => (
                      <th scope="col" key={`${c}-${i}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {widget.rows.map((row, ri) => (
                    <tr key={`${row.label}-${ri}`}>
                      <th scope="row" className="heatmap-rowhead" title={row.sublabel}>
                        {row.label}
                      </th>
                      {row.cells.map((cell, ci) => {
                        if (cell.value === null) {
                          return (
                            <td className="heatmap-cell heatmap-empty" key={ci} title={cell.title}>
                              —
                            </td>
                          );
                        }
                        const color = TONE_COLOR[cell.tone ?? "blue"];
                        return (
                          <td
                            className="heatmap-cell"
                            key={ci}
                            title={cell.title}
                            style={{ background: hexToRgba(color, 0.16), boxShadow: `inset 0 -2px 0 ${color}` }}
                          >
                            {cell.display ?? cell.value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {widget.legend && widget.legend.length > 0 ? (
              <div className="heatmap-legend">
                {widget.legend.map((l, i) => (
                  <span className="heatmap-legend-item" key={`${l.label}-${i}`}>
                    <span
                      aria-hidden="true"
                      className="heatmap-legend-swatch"
                      style={{ background: TONE_COLOR[l.tone] }}
                    />
                    {l.label}
                  </span>
                ))}
              </div>
            ) : null}
          </>
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
    case "heatmap":
      return <HeatmapBlock widget={widget} />;
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
