import type { AuthenticatedUser } from "@/lib/auth";
import type { PermissionKey } from "@/lib/permissions";

export type Tone = "blue" | "green" | "amber" | "red" | "cyan";

export type Kpi = {
  label: string;
  value: string | number;
  note?: string;
  tone?: Tone;
};

/** A column in a table widget. numeric → right-align + tabular figures. */
export type WidgetColumn = {
  key: string;
  label: string;
  numeric?: boolean;
};

export type TableWidget = {
  kind: "table";
  id: string;
  title: string;
  columns: WidgetColumn[];
  rows: Array<Record<string, string | number>>;
  /** Include this table in CSV/PDF export (default true). */
  exportable?: boolean;
  emptyLabel?: string;
};

export type BarItem = { label: string; value: number; max?: number; tone?: Tone; hint?: string };

export type BarWidget = {
  kind: "bar";
  id: string;
  title: string;
  items: BarItem[];
  /** Unit suffix for the displayed value, e.g. "h" or "$". */
  unit?: string;
};

export type DonutSegment = { label: string; value: number; tone?: Tone };

export type DonutWidget = {
  kind: "donut";
  id: string;
  title: string;
  segments: DonutSegment[];
  centerLabel?: string;
};

/** A horizontal timeline (Gantt) row positioned within a shared date window. */
export type GanttRow = {
  label: string;
  sublabel?: string;
  startMs: number;
  endMs: number;
  tone?: Tone;
};

export type GanttWidget = {
  kind: "gantt";
  id: string;
  title: string;
  windowStartMs: number;
  windowEndMs: number;
  rows: GanttRow[];
  /** Tick labels rendered across the top, evenly spaced. */
  ticks: string[];
};

/** A single cell in a heatmap. value is the numeric measure (e.g. a
 *  utilization %); null renders as an empty / no-data cell. tone drives the
 *  color band, display overrides the rendered text. */
export type HeatmapCell = {
  value: number | null;
  display?: string;
  tone?: Tone;
  title?: string;
};

export type HeatmapRow = {
  label: string;
  sublabel?: string;
  cells: HeatmapCell[];
};

/** A row-label × column matrix (e.g. work-center × month utilization). Each
 *  row's cells line up positionally with `columns`. */
export type HeatmapWidget = {
  kind: "heatmap";
  id: string;
  title: string;
  /** Column headers; one entry per cell index. */
  columns: string[];
  /** Header for the row-label column (top-left corner). */
  rowHeader?: string;
  rows: HeatmapRow[];
  /** Legend chips rendered under the matrix. */
  legend?: Array<{ label: string; tone: Tone }>;
  emptyLabel?: string;
};

export type Widget = TableWidget | BarWidget | DonutWidget | GanttWidget | HeatmapWidget;

export type DashboardData = {
  kpis: Kpi[];
  widgets: Widget[];
  /** ISO timestamp stamped by the renderer (loaders stay time-pure). */
  generatedAt?: string;
  /** Optional note shown under the header (assumptions, scope). */
  note?: string;
};

export type DashboardContext = {
  organizationId: string;
  user: AuthenticatedUser;
};

export type DashboardDef = {
  key: string;
  title: string;
  eyebrow: string;
  description: string;
  /** Origin repo this dashboard reimagines, for traceability. */
  inspiredBy?: string;
  permission: PermissionKey;
  load: (ctx: DashboardContext) => Promise<DashboardData>;
};
