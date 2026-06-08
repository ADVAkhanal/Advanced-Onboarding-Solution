# Maintenance / CMMS Module

A native maintenance (CMMS) module — equipment asset register, preventive-
maintenance schedule, maintenance work orders, MRO parts/supplies, and a
downtime log. Reimagines the standalone "Maintenance Command" app over the
ERP's Prisma + RBAC + dashboard engine.

> Working tree: `C:/Users/Akhanal/Documents/Shop Management/`.

---

## Data model (`prisma/schema.prisma`, migration `20260602100000_maintenance_cmms`)

| Model | Purpose |
|---|---|
| `Machine` | Physical asset: tag/code, name, category, building, status, work envelope, footprint. Loosely linked to `WorkCenter` by `code`. |
| `MaintenanceWorkOrder` | Maintenance request / job: title, machine, priority, status (REQUESTED → ASSIGNED → IN_PROGRESS → DONE), assignee, due date, source (internal/public). |
| `PmTask` | Recurring preventive-maintenance task: machine, title, frequency, est. minutes, next-due / last-done. |
| `PmCompletion` | **Append-only** record of a completed PM (AS9100D records-retention posture). |
| `MaintenancePart` | MRO consumable/supply: name, category, on-hand, reorder point, critical flag. *Not* production inventory (`InventoryItem`). |
| `MaintenanceDowntimeEvent` | Unplanned-stop log: machine, start, hours, reason, root cause, resolution. |

All tables are org-scoped, carry audit columns + `archivedAt`, and hold only
operational metadata — no CUI/ITAR or proprietary process parameters. Machine
work envelopes are published specs; PM cadence is generic; MRO items are
mundane shop supplies.

## Access (`src/lib/permissions.ts`)

- **`maintenance:view`** — view everything + *report a machine issue* (create a work order). Held by USER, MANAGER, DIRECTOR, ADMIN.
- **`maintenance:manage`** — machines CRUD, triage/assign/close work orders, check off PM, adjust MRO stock, log downtime, load the baseline. MANAGER, DIRECTOR, ADMIN.

## Pages (`/maintenance`)

| Route | What |
|---|---|
| `/maintenance` | Overview: uptime, machines down, PM due, open WOs, low MRO; one-click baseline loader when empty. |
| `/maintenance/machines` | Asset roster + add machine. |
| `/maintenance/work-orders` | Report an issue (any user) + triage board with inline status/assignee (manage). |
| `/maintenance/pm` | PM schedule bucketed overdue / today / this week / later + one-click check-off. |
| `/maintenance/parts` | MRO inventory with low/critical flags + quick ± adjust. |
| `/maintenance/downtime` | Downtime event log. |

## API (`/api/maintenance/*`)

`machines` (POST), `work-orders` (POST) + `work-orders/[id]` (PATCH status/assignee),
`pm` (POST) + `pm/[id]/complete` (POST — logs completion, rolls next-due by frequency),
`parts` (POST) + `parts/[id]/adjust` (POST — signed delta), `downtime` (POST),
`seed` (POST — idempotent baseline). Every write is validated, data-boundary
checked, and audit-logged.

## Dashboard

`maintenance-health` in the dashboard registry — uptime, machines down, open/
overdue WOs, PM overdue, downtime hours, MRO low stock, and top problem
machines. CSV + print auto-wired like every other dashboard.

## Baseline seed (`src/lib/maintenance-seed.ts`)

`seedMaintenanceBaseline(orgId, userId)` loads the real Advanced PMC machine
roster (CNC + support, no serials), the MRO supply list, and per-category PM
cadence. **Idempotent** — a no-op once any machine exists. Triggered on demand
from the Overview tab (manage permission), so it works for the existing tenant
without touching the boot path.

## Verification

```bash
npm run lint && npm run typecheck && npm test
npx next build            # /maintenance/* + maintenance-health compile
```

Smoke: open `/maintenance` → **Load Advanced machine roster** → roster, PM
schedule, and MRO list populate → report a work order → check off a PM → adjust
a part → `/erp/dashboards/maintenance-health` reflects it.
