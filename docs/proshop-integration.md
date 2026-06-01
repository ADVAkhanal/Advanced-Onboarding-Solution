# ProShop Integration (read-only)

A live, read-only bridge to ProShop (the system of record) using its
GraphQL API. Adapted from the proven IT-Dashboard pattern and the
proshop-graphql-query-builder skill's safety rules.

> Working tree: `C:/Users/Akhanal/Documents/Shop Management/`.

---

## Status

- **Read-only.** ProShop remains the system of record; this only queries.
- **Env-gated, disabled by default.** With no `PROSHOP_*` env set, the
  integration is inert and never reaches the network.
- **Unverified against a live instance from this repo.** The one query
  used is the field set proven on the live instance via IT-Dashboard
  (~1042 active work orders). Confirm field names against your tenant
  before relying on it in production.

---

## Configuration

| Env var | Purpose |
|---|---|
| `PROSHOP_ROOT` | e.g. `https://yourshop.proshoperp.com` |
| `PROSHOP_API_TOKEN` | Bearer token (simplest path) |
| `PROSHOP_CLIENT_ID` / `PROSHOP_CLIENT_SECRET` | OAuth client_credentials (alternative) |
| `PROSHOP_SCOPE` | Optional OAuth scope |

Provide a root **plus** either a token **or** client id/secret. Credentials
live only in the environment — never in code or the database.

---

## What it does

| Piece | File |
|---|---|
| GraphQL client (token, timeout, errors) | `src/lib/proshop/client.ts` |
| Active work orders query + pagination + parse | `src/lib/proshop/work-orders.ts` |
| ProShop Backlog dashboard | `src/lib/dashboards/proshop-backlog.ts` → `/erp/dashboards/proshop-backlog` |

The dashboard shows active-WO count, backlog value, overdue, due-within-7-days,
backlog-by-customer, and a soonest-due table. It exports to CSV/PDF like
every other dashboard. When ProShop isn't configured it renders a clean
"Not connected" message.

### The confirmed query

```graphql
query ($pageSize: Int = 100, $pageStart: Int = 0) {
  workOrders(pageSize: $pageSize, pageStart: $pageStart, query: { status: { exactly: "Active" } }) {
    totalRecords
    records {
      workOrderNumber status dueDate mustLeaveBy
      customerPlainText partPlainText estWODollarAmount
    }
  }
}
```

Offset pagination (`pageStart` += `pageSize`, stop at `totalRecords`),
capped at 15 pages, with a minimal-field fallback on schema error and a
30-second cache. Field selection is minimized per NIST 800-171 3.1.2.

---

## Safety / compliance

- Token is used server-side only; never sent to the browser.
- Only the fields needed for the backlog view are requested.
- ProShop request failures surface as a visible error on the dashboard,
  not a silent empty state.
- No ProShop data is persisted yet (see follow-up) — it is fetched live.

---

## Follow-ups

1. **Postgres sync-table mirror** (`proshop_work_orders_refs`: source,
   external_id, external_number, status, due_at, synced_at, sync_status,
   raw_hash, data_classification) per the skill's integration pattern —
   so backlog survives ProShop downtime and can drive Sales-Advanced
   "backlog" the way the source KPI sheet does. Needs a live instance to
   validate field names.
2. **Scheduled sync job** with audit logging of each run (sync/failed/stale).
3. **More queries** (NCRs, POs, quotes) once their field sets are confirmed
   via schema introspection.
