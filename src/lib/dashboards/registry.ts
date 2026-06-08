import type { DashboardDef } from "./types";
import { loadAdvancedCapacity } from "./advanced-capacity";
import { loadCapacityHeatmap } from "./capacity-heatmap";
import { loadFirstPiece } from "./first-piece";
import { loadMaintenanceHealth } from "./maintenance-health";
import { loadNpi } from "./npi";
import { loadPkGant } from "./pk-gant";
import { loadProShopBacklog } from "./proshop-backlog";
import { loadSalesAdvanced } from "./sales-advanced";
import { loadScheduling } from "./scheduling";
import { loadShopHealth } from "./shop-health";

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
    key: "capacity-heatmap",
    title: "Capacity Heatmap",
    eyebrow: "Analytics · Capacity",
    description:
      "Work-center × month utilization matrix with over-capacity alerts — open load (setup + run hours) bucketed by month vs configured capacity.",
    inspiredBy: "ADVAkhanal/AdvancedCapacity · Scheduling · PK-GANT (loaded-hours panel)",
    permission: "report:view",
    load: loadCapacityHeatmap
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
  },
  {
    key: "proshop-backlog",
    title: "ProShop Backlog",
    eyebrow: "Analytics · ProShop (live)",
    description: "Live, read-only active work orders pulled from ProShop — backlog value, overdue, due-soon, by customer.",
    inspiredBy: "ADVAkhanal/IT-Dashboard (ProShop GraphQL)",
    permission: "report:view",
    load: loadProShopBacklog
  },
  {
    key: "shop-health",
    title: "Shop Floor Health",
    eyebrow: "Analytics · Operations",
    description: "Operational vitals: utilization, remaining time, late risk, bottlenecks, reject/rework rate, inspection queue aging, and schedule adherence.",
    permission: "report:view",
    load: loadShopHealth
  },
  {
    key: "maintenance-health",
    title: "Maintenance Health",
    eyebrow: "Analytics · Maintenance",
    description:
      "CMMS vitals: uptime, machines down, open + overdue work orders, PM overdue, downtime hours, MRO low stock, and top problem machines.",
    inspiredBy: "Maintenance Command (standalone app)",
    permission: "maintenance:view",
    load: loadMaintenanceHealth
  }
];

export function getDashboard(key: string): DashboardDef | undefined {
  return DASHBOARDS.find((d) => d.key === key);
}
