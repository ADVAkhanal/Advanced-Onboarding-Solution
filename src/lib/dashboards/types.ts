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

export type Widget = TableWidget | BarWidget | DonutWidget | GanttWidget;

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
