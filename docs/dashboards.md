# Operations Dashboards

A dynamic, data-driven dashboard engine. Each dashboard is a declarative
definition over live ERP data; one generic renderer + export pipeline
serves all of them. Every dashboard exports to CSV and prints to PDF.

> Working tree: `C:/Users/Akhanal/Documents/Shop Management/`.

---

## How it works

| Piece | File |
|---|---|
| Widget + dashboard types | `src/lib/dashboards/types.ts` |
| Registry (`getDashboard`, `DASHBOARDS`) | `src/lib/dashboards/registry.ts` |
| Per-dashboard loaders | `src/lib/dashboards/<key>.ts` |
| Generic renderer | `src/components/dashboard-render.tsx` |
| CSV serializer (pure, tested) | `src/lib/export/csv.ts` |
| Index page | `/erp/dashboards` |
| Renderer page | `/erp/dashboards/[key]` |
| Print/PDF page | `/erp/dashboards/[key]/print` |
| CSV export API | `GET /api/erp/dashboards/[key]/export.csv` |

A dashboard definition returns `DashboardData`: a list of KPIs plus
declarative **widgets** — `table`, `bar`, `donut`, `gantt`, or `heatmap`. The
renderer turns those into existing `globals.css` primitives (`.kpi`,
`.bar-list`, `.donut` conic-gradient, `DataTable`, and a dependency-free
CSS `.gantt`). **No charting library.**

### Adding a dashboard

1. Write `src/lib/dashboards/<key>.ts` exporting `load(ctx) => Promise<DashboardData>`.
2. Add one entry to `DASHBOARDS` in `registry.ts` (key, title, permission, `load`).

That's it — index, renderer, print, and CSV export all pick it up. No new route or component.

---

## Access & exports

- All dashboards are gated by **`report:view`** (MANAGER, DIRECTOR, ADMIN). USER has no access; the index is permission-filtered.
- **CSV**: exports the dashboard's `table` widgets via `/api/erp/dashboards/[key]/export.csv` (optional `?widget=<id>`). Every export is audit-logged as `dashboard.export_csv`.
- **PDF**: the `/print` page renders the same data inside the shared print stylesheet; "Save as PDF" from the browser.
- Dashboards are **org-scoped** today. Department scoping is a follow-up.
- Data-scope boundary: operational metadata only (counts, hours, statuses, values) — no CUI/PII/technical data.

---

## The dashboards

Each reimagines an `ADVAkhanal/*` repo over existing ERP data. (Those
repos could not be read from this environment, so each is built from its
name + machine-shop domain; assumptions are noted in each loader and
surfaced in-UI. Correct any that differ from the originals.)

| Key | Title | Source data | Highlights |
|---|---|---|---|
| `sales-advanced` | Sales Advanced | Quote, SalesOrder, CustomerAccount | Open value, win rate, value-by-status, top customers |
| `advanced-capacity` | Advanced Capacity | WorkOrderOperation, WorkOrder | Remaining hours + utilization by work center, overdue WOs |
| `capacity-heatmap` | Capacity Heatmap | WorkOrderOperation, WorkOrder, WorkCenter | WC × month utilization matrix, over-capacity alerts, loaded-hours panel (integrates AdvancedCapacity heatmap + Scheduling + PK-GANT hours panel) |
| `scheduling` | Scheduling | ShopScheduleItem, WorkOrder | Next 7 days, late items, status mix, load by center |
| `pk-gant` | PK Gantt | WorkOrderOperation | CSS Gantt timeline, overdue bars |
| `first-piece` | First-Piece Run Tracker | QualityInspection, NonconformanceRecord | FAI pass rate, overdue inspections, NCRs by severity |
| `npi` | NPI Dashboard | Part, QuoteLine, WorkOrder | New parts (90d) funnel New → Quoted → In production |
| `proshop-backlog` | ProShop Backlog | ProShop GraphQL (live) | Active work orders, backlog value, overdue, due-soon, by customer. See `docs/proshop-integration.md`. |
| `shop-health` | Shop Floor Health | WorkOrder, WorkOrderOperation, QualityInspection | Operational vitals: utilization, remaining time, late risk, bottlenecks, reject/rework rate, inspection queue aging, schedule adherence |
| `maintenance-health` | Maintenance Health | Machine, MaintenanceWorkOrder, PmTask, PmCompletion, MaintenanceDowntimeEvent, MaintenancePart | CMMS vitals: uptime, machines down, open/overdue WOs, PM overdue, downtime hours, MRO low stock, top problem machines. See `docs/maintenance-module.md`. |
| `support-desk` | Support Desk | Ticket, TicketCenter | Helpdesk SLA lens (`src/lib/sla.ts`, tested): breached/at-risk queues, SLA-met rate, resolution time, queue aging, load by priority/center. Triage at `/tickets/board`. |

The source repos were read this round (public). They are upload-driven
Express/Postgres trackers, so these live-ERP versions are modernizations
that match the real metric definitions: Sales-Advanced is a monthly
target-vs-actual KPI sheet (we add a monthly quote trend + machine
plan-vs-actual hours); AdvancedCapacity/Scheduling are an MPS
capacity-vs-load model (we added the WorkCenter capacity table and
util = load ÷ capacity); First-Piece-Run-Tracker is a First Pass Yield
log (we added FPY); PK-GANT is a Gantt; npi-dashboard is an NPI funnel.

---

## Assumptions worth revisiting

- **Capacity**: nominal capacity is a 40 h/week placeholder per work center until a `WorkCenter` capacity table exists; an operation counts as load when its status is not done/cancelled.
- **First-piece**: "first article" is detected by inspection type containing first / FAI / article; falls back to all inspections when none match.
- **NPI**: "new" = `Part.createdAt` within 90 days; "in production" = an active work order references the part.
- **Done/active status sets** are matched against common string values (DONE/COMPLETE/CANCELLED/…); align these with your actual status vocabularies if they differ.

---

## Verification

```bash
npm run lint && npm run typecheck && npm test    # csv util tested
npx next build                                    # all dashboard routes compile
npm run dev                                        # → /erp/dashboards
```

Smoke: open each dashboard, click **Export CSV** (downloads `<key>.csv`)
and **Print / PDF** (clean print preview, no app chrome).
