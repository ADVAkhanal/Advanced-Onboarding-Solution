# First-Piece / NPI Run Tracker

A shop-floor log of first-article / prove-out runs — the live data behind First
Pass Yield. Reimagines the standalone "NPI LIVE" and "First Pass Yield Tracker"
apps over the ERP's Prisma + RBAC + dashboard engine.

> Working tree: `C:/Users/Akhanal/Documents/Shop Management/`.

---

## Data model (`prisma/schema.prisma`, migration `20260602120000_first_piece_runs`)

`FirstPieceRun` — wo, partNumber, customer, workCenter, runNumber, opNumber,
inspectionMethod, setupTech, status (On Cycle / Inspection / In Queue /
Completed), result (Pass / Fail / Pending), defectCode, dmaxLab, opStartDate,
detail. Org-scoped, audited, archivable.

**Compliance:** operational metadata only. The part number is an operational
identifier (the ERP already stores `Part.partNumber`) — *not* the controlled
drawing or any process parameter. No production run data is seeded/committed;
runs are entered at runtime.

## Reference vocabularies (`src/lib/first-piece-data.ts`)

The real Advanced PMC picklists: customers, work centers, setup techs,
inspection methods, statuses, results, and the internal NC defect-code taxonomy.
These are business/operational metadata, not controlled data.

## Access

- Logging and outcome updates require **`erp:view`** — a shop-floor action any
  ERP user can perform (operators log their own first pieces and update the
  result after inspection).

## UI & API

- Board: **`/erp/first-piece`** — FPY / defect-rate / pass-fail-pending KPIs, a
  "log a run" form (real picklists), and a run log with inline status + result
  editing. Linked from **Quality & NCRs**.
- API: `POST /api/erp/first-piece` (create) and `PATCH /api/erp/first-piece/[id]`
  (update status / result / defect / tech / method). Validated, data-boundary
  checked, audit-logged.

## Dashboard tie-in

The existing **`first-piece`** dashboard folds run data in when present: a
real **FPY (run tracker)** KPI (run #1 pass rate) and a **defect-code Pareto**
of fail reasons — alongside the inspection-based metrics. No silo.

## Verification

```bash
npm run lint && npm run typecheck && npm test
npx next build      # /erp/first-piece + first-piece dashboard compile
```

Smoke: `/erp/first-piece` → log a run (Pass) → log a Fail with a defect code →
KPIs + run log update → `/erp/dashboards/first-piece` shows FPY (run tracker) +
the defect Pareto.
