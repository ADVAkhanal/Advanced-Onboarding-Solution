import type { DashboardDef } from "./types";
import { loadSalesAdvanced } from "./sales-advanced";

/**
 * Dashboard registry. Each entry is a self-contained, data-driven
 * definition rendered by the generic /erp/dashboards/[key] page and
 * exported by /api/erp/dashboards/[key]/export.csv. Add a dashboard by
 * adding a loader + an entry here — no new route or component needed.
 *
 * Every dashboard reads only operational metadata (counts, hours,
 * statuses, values) and stays inside the platform data-scope boundary.
 */
export const DASHBOARDS: DashboardDef[] = [
  {
    key: "sales-advanced",
    title: "Sales Advanced",
    eyebrow: "Analytics · Sales",
    description:
      "Quoting pipeline health — open value, win rate, value by status, and top customers.",
    inspiredBy: "ADVAkhanal/Sales-Advanced",
    permission: "report:view",
    load: loadSalesAdvanced
  }
];

export function getDashboard(key: string): DashboardDef | undefined {
  return DASHBOARDS.find((d) => d.key === key);
}
