# Quoting Engine

Manufacturing-aware quoting for Advanced PMC. The strategic wedge against ProShop is fast, defensible cycle-time estimation derived from historical jobs rather than a blank cost sheet. An estimator picks broad manufacturing buckets (material × process × complexity × diameter); the system looks up calibrated setup/cycle estimates, computes a price with margin, and tracks the quote through to a sales order.

> Working tree: `C:/Users/Akhanal/Documents/Shop Management/` (package `cleanops-command-center`).

---

## Data scope boundary

This module deliberately stays **out of** CUI / ITAR scope:

- Material is a broad **category** (`ALUMINUM`, `TITANIUM`, …), never an alloy spec number.
- No drawings, router details, or controlled technical data are stored.
- `Part.exportControlFlag` / the intake export-control checkbox mark a part for off-platform review — the flag is metadata only.
- All write endpoints run `assertNoProhibitedFields` (blocks SSN/banking/cards/credentials/CUI keys) before persisting.

---

## Schema

Migration: `prisma/migrations/20260528160000_quoting_engine_manufacturing/`

### Enums

- `MaterialCategory` — 11 broad buckets.
- `ManufacturingProcess` — TURNING, MILLING, MULTI_SPINDLE, SWISS_TURNING, GRINDING, EDM, WIRE_EDM, HONING, LAPPING, INSPECTION, ASSEMBLY, OTHER.
- `ComplexityClass` — SIMPLE, MODERATE, COMPLEX, HIGHLY_COMPLEX.
- `DiameterClass` — UNDER_25_MM … OVER_300_MM, NOT_APPLICABLE.

### Tables

| Table | Role |
|---|---|
| `Quote` (existing, extended) | Quote header — number, customer, status, priority, dueDate, validUntil, estimatedValue, marginTarget, owner. |
| `QuoteLine` (existing, extended) | Per-part line. Added: bucket fields + cost **snapshots** (setupHours, cycleMinutesPerPiece, materialCostPerUnit, laborRatePerHour, burdenRatePerHour, marginPercent), `cycleTimeLookupId`, `routingNotes`. Snapshots are frozen at quote time. |
| `CycleTimeLookup` (new) | The differentiator. One row per `(org, material, process, complexity, diameter)` bucket. Holds `estimatedSetupHours`, `estimatedCycleMinutes`, `sampleSize`, `confidenceScore`, `lastReviewedAt`. |

`Quote ↔ QuoteLine` is a loose FK (no Prisma `@relation`); line counts use `groupBy`. Normalizing this relation is a known follow-up.

---

## Permissions

Catalog in `src/lib/permissions.ts`:

| Permission | USER | MANAGER | DIRECTOR | ADMIN |
|---|---|---|---|---|
| `quote:view` | ✅ | ✅ | ✅ | ✅ |
| `quote:create` | — | ✅ | ✅ | ✅ |
| `quote:price` | — | ✅ | ✅ | ✅ |
| `quote:submit` | — | — | ✅ | ✅ |
| `quote:admin` | — | — | — | ✅ |
| `cycletime:view` | — | ✅ | ✅ | ✅ |
| `cycletime:manage` | — | — | ✅ | ✅ |

`quote:submit` (QUOTED/WON/LOST transitions + conversion) is gated to director+ because those are customer-facing commercial commitments.

---

## Routes & API

| Surface | Path | Permission |
|---|---|---|
| Quote list + KPIs + status filter | `/erp/quotes` | `erp:view` (USER redirected) |
| Manufacturing intake | `/erp/quotes/new` | `quote:create` |
| Quote detail (lines, totals, audit, status, convert) | `/erp/quotes/[id]` | `quote:view` |
| Cycle-time lookup admin | `/erp/quotes/cycle-times` | `cycletime:view` (edit needs `cycletime:manage`) |
| Create quote + line (txn) | `POST /api/erp/quotes/manufacturing` | `quote:create` |
| Add line to quote | `POST /api/erp/quotes/[id]/lines` | `quote:price` |
| Status transition | `POST /api/erp/quotes/[id]/status` | `quote:price` (+`quote:submit` for QUOTED/WON/LOST) |
| Convert to sales order | `POST /api/erp/quotes/[id]/convert` | `quote:submit` |
| Upsert cycle-time lookup | `POST /api/erp/cycle-times` | `cycletime:manage` |

Every mutation appends to `AuditLog` via `recordAudit`.

---

## Pricing math

`src/lib/quoting.ts` → `estimateLine()` (pure, unit-tested in `tests/run-tests.ts`):

```
cycleHours = cycleMinutesPerPiece * quantity / 60
totalHours = setupHours + cycleHours
subtotal   = totalHours * (laborRate + burdenRate) + materialCostPerUnit * quantity
total      = subtotal / (1 - marginFraction)      # markup, so margin% is % of TOTAL
unitPrice  = total / quantity
```

- Margin is applied as a **divisor** (markup), so a 25% margin yields 25% of the final price, not of cost.
- Margin is clamped to 95% to avoid divide-by-zero on a 100% input.
- `quantity = 0` yields `unitPrice = 0` (guarded).

Lookup precedence on intake/add-line: explicit `cycleTimeLookupId` → bucket match → zero (operator must fill manually).

---

## Status state machine

Enforced server-side in `POST /api/erp/quotes/[id]/status`:

```
DRAFT    → QUOTED, ON_HOLD
QUOTED   → WON, LOST, ON_HOLD, EXPIRED, DRAFT
ON_HOLD  → DRAFT, QUOTED, LOST
WON      → (terminal)
LOST     → (terminal)
EXPIRED  → DRAFT
```

WON/LOST transitions require a reason (audit-captured). Lines lock on WON/LOST.

---

## Demo data

`prisma/seed-demo.ts` seeds 17 calibrated cycle-time buckets (idempotent on the bucket unique key). Titanium and nickel-alloy buckets carry low confidence + review notes.

```bash
ALLOW_DEMO_SEED=true npm run seed:demo
```

---

## Known follow-ups

1. `SalesOrderLine` table + value column — conversion currently links via `quoteId` and captures the total in notes; lines are not copied.
2. Normalize `Quote ↔ QuoteLine` and `Quote ↔ CycleTimeLookup` Prisma relations.
3. Customer-facing PDF render of a quote.
4. Quote line **edit/delete** (currently add-only).
5. Auto-refresh `CycleTimeLookup` estimates from completed `WorkOrder` actuals (closes the historical-data loop that makes the estimates defensible).

---

## Verification

```bash
npm run lint && npm run typecheck && npm test     # all green
npx next build                                    # all quoting routes compile
npx prisma migrate deploy                          # apply 20260528160000_quoting_engine_manufacturing
ALLOW_DEMO_SEED=true npm run seed:demo             # populate lookups
npm run dev                                         # visit /erp/quotes
```

End-to-end smoke: create a manufacturing quote (titanium / turning / complex shows a lookup match) → open detail → add a second line → mark QUOTED then WON → convert to sales order.
