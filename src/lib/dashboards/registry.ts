import type { DashboardDef } from "./types";
import { loadAdvancedCapacity } from "./advanced-capacity";
import { loadFirstPiece } from "./first-piece";
import { loadNpi } from "./npi";
import { loadPkGant } from "./pk-gant";
import { loadSalesAdvanced } from "./sales-advanced";
import { loadScheduling } from "./scheduling";

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
  },
  {
    key: "advanced-capacity",
    title: "Advanced Capacity",
    eyebrow: "Analytics · Capacity",
    description:
      "Remaining shop load and utilization by work center, with overdue work-order risk.",
    inspiredBy: "ADVAkhanal/AdvancedCapacity",
    permission: "report:view",
    load: loadAdvancedCapacity
  },
  {
    key: "scheduling",
    title: "Scheduling",
    eyebrow: "Analytics · Scheduling",
    description: "Near-term schedule: next 7 days, late items, status mix, and load by work center.",
    inspiredBy: "ADVAkhanal/Scheduling",
    permission: "report:view",
    load: loadScheduling
  },
  {
    key: "pk-gant",
    title: "PK Gantt",
    eyebrow: "Analytics · Schedule timeline",
    description: "Gantt timeline of scheduled work-order operations with overdue highlighting.",
    inspiredBy: "ADVAkhanal/PK-GANT",
    permission: "report:view",
    load: loadPkGant
  },
  {
    key: "first-piece",
    title: "First-Piece Run Tracker",
    eyebrow: "Analytics · Quality",
    description: "First-article / FAI inspection pass rate, overdue inspections, and open NCRs.",
    inspiredBy: "ADVAkhanal/First-Piece-Run-Tracker",
    permission: "report:view",
    load: loadFirstPiece
  },
  {
    key: "npi",
    title: "NPI Dashboard",
    eyebrow: "Analytics · New Product Introduction",
    description: "New parts (90d) and their funnel: New → Quoted → In production, by material.",
    inspiredBy: "ADVAkhanal/npi-dashboard",
    permission: "report:view",
    load: loadNpi
  }
];

export function getDashboard(key: string): DashboardDef | undefined {
  return DASHBOARDS.find((d) => d.key === key);
}
