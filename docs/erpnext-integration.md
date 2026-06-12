# ERPNext Integration — Architecture Decision Record

> How Advanced PMC forks ERPNext and runs Shop-Management **on top of it**,
> done the way it should be done — not the way it's tempting to do it.

---

## TL;DR

- **Fork** `frappe/erpnext` → `ADVAkhanal/erpnext`, kept **pristine and pinned** (e.g. `v15`). We never edit core, so we can always rebase on upstream.
- **Extend** ERPNext through a **custom Frappe app** (`advanced_pmc`) — the idiomatic, supported seam. All Advanced-specific doctypes, fields, fixtures, and server methods live there.
- **Shop-Management (this Next.js app) stays on top** as the **headless experience layer** and the home of the modules ERPNext doesn't have (SOP AI assistant, the dashboard engine, Maintenance CMMS, First-Piece tracker, Training). It talks to ERPNext over a **typed, read-only API bridge** (`src/lib/erpnext/`).
- Run ERPNext reproducibly with **pinned Docker** (`erpnext-integration/`). It needs Linux + MariaDB + Redis, so it does not run on the Windows dev box — it runs on a Linux host / Railway / a VM.
- **Compliance is a code guard, not a convention:** the bridge can only read an **operational doctype allowlist**. Accounting (GL/Payment/Bank), Payroll/HR (Salary/Employee), and contact PII are unreachable through it.

---

## Why not literally merge the two codebases?

It's the obvious-but-wrong move. Three reasons the decoupled design wins:

1. **Licensing.** ERPNext is **GPLv3**. Physically merging Shop-Management's source into the ERPNext tree risks creating a single combined GPL work. A separate frontend that talks to ERPNext **over its HTTP API** is the well-trodden way to keep the frontend's licensing independent. (Decoupling is the *reason* "headless ERPNext" is a common pattern.)
2. **Upgradeability.** ERPNext ships continuously. Forking and patching **core** means every `bench update` becomes a merge conflict. Extending via a **custom app** + a **pinned** core fork means upgrades stay a one-line version bump.
3. **Separation of concerns.** Frappe is a mature, batteries-included Python/MariaDB platform (permissions, workflow, doctypes, reports). Next.js is a best-in-class UX runtime. Each does what it's great at; the API is the contract.

> Rule of thumb the Frappe community lives by: **never fork ERPNext to customize it — write a custom app.** The fork exists only to pin a known-good version and to host org-wide config.

---

## Topology

```
        ┌────────────────────────────┐         ┌──────────────────────────────┐
        │  Shop-Management (Next.js)  │         │   ERPNext (forked, pinned)    │
        │  - experience layer / UX    │  HTTPS  │   frappe/erpnext @ v15        │
        │  - SOP AI, dashboards,      │ ───────▶│   + custom app: advanced_pmc  │
        │    Maintenance, First-Piece │  token  │   (doctypes, fixtures, API)   │
        │  - src/lib/erpnext/ bridge  │◀─────── │   MariaDB · Redis · workers    │
        └────────────────────────────┘  JSON   └──────────────────────────────┘
                 Postgres (its own)                   system of record for the
                                                      core ERP domain
```

- **Auth:** Frappe **API key + secret** (`Authorization: token <key>:<secret>`) for a least-privilege integration user. (OAuth2 / SSO is a later upgrade for end-user identity federation.)
- **Direction:** read-only today (mirrors the ProShop posture). Writes go through ERPNext's own UI/API until a domain is formally cut over.

---

## What lives where (domain ownership)

| Domain | System of record | Notes |
|---|---|---|
| Customers, Suppliers, Items, Item/Customer Groups, UOM, Warehouses | **ERPNext** | Masters. Bridge reads them. |
| BOM, Work Orders, Job Cards, Operations, Workstations, Routing | **ERPNext** | ERPNext Manufacturing is deeper than the current native WO model. |
| Quotations, Sales Orders, Purchase Orders, Delivery Notes, Stock Entries | **ERPNext** | |
| Quality Inspection (+ templates) | **ERPNext** | Complements the native First-Piece run board. |
| **Accounting, Payments, Bank, Tax** | ERPNext (in its own instance) | **Not bridged.** Outside the platform data-scope boundary. |
| **Payroll, Salary, Employee bank/PII** | ERPNext (in its own instance) | **Not bridged.** |
| SOP Knowledge Base (AI, citations) | **Shop-Management** | No ERPNext equivalent. |
| Dashboard engine (Capacity Heatmap, Shop/Maintenance Health, …) | **Shop-Management** | Reads ERP records (native + bridged). |
| Maintenance / CMMS, First-Piece run tracker, Training/Quizzes | **Shop-Management** | Native modules. |

### Prisma model ↔ ERPNext DocType mapping (for coexistence / migration)

| Shop-Management (Prisma) | ERPNext DocType |
|---|---|
| `CustomerAccount` | `Customer` |
| `VendorAccount` | `Supplier` |
| `Part` | `Item` |
| `WorkOrder` | `Work Order` |
| `WorkOrderOperation` | `Job Card` / `Operation` |
| `WorkCenter` | `Workstation` |
| `Quote` / `QuoteLine` | `Quotation` |
| `SalesOrder` | `Sales Order` |
| `PurchaseOrder` / `PurchaseOrderLine` | `Purchase Order` |
| `InventoryItem` / `InventoryTransaction` | `Bin` / `Stock Entry` |
| `QualityInspection` | `Quality Inspection` |
| (no native BOM) | `BOM` ← **gap ERPNext fills** |

---

## The bridge (this repo)

`src/lib/erpnext/client.ts` — env-gated, read-only, allowlist-guarded:

- `isErpNextConfigured()` — true only when `ERPNEXT_BASE_URL` + `ERPNEXT_API_KEY` + `ERPNEXT_API_SECRET` are all set.
- `erpnextPing()` — liveness (`frappe.auth.get_logged_user`).
- `erpnextList(doctype, {fields, filters, limit, orderBy})` / `erpnextGetDoc(doctype, name)` — **reject any doctype not in `ALLOWED_DOCTYPES`**.
- Admin page: `/erp/integrations/erpnext` (shows config, live connection, the allowlist). Health: `/health` → `integrations.erpnextConfigured`. Probe: `GET /api/erp/erpnext/ping`.

Disabled by default — with no `ERPNEXT_*` env, nothing reaches the network.

---

## Stand it up (Linux / Docker host)

```bash
# 1. Fork (once), on GitHub or via gh:
gh repo fork frappe/erpnext --org ADVAkhanal --clone=false   # → ADVAkhanal/erpnext

# 2. Bring up a pinned ERPNext (see erpnext-integration/):
cd erpnext-integration
cp .env.example .env            # set ERPNEXT_VERSION=v15, DB password, site name
docker compose up -d            # MariaDB + Redis + workers + ERPNext + site create

# 3. Install the custom app on top (the "your code on top" seam):
docker compose exec backend bench get-app advanced_pmc /workspace/apps/advanced_pmc
docker compose exec backend bench --site <site> install-app advanced_pmc

# 4. In ERPNext: a least-privilege integration user → API Key + Secret.

# 5. In Shop-Management (Railway) env:
ERPNEXT_BASE_URL=https://erp.advancedpmc.com
ERPNEXT_API_KEY=...
ERPNEXT_API_SECRET=...
# → /erp/integrations/erpnext shows "Connected".
```

---

## Phased migration (coexistence → cutover)

1. **Mirror (now):** bridge reads ERPNext masters; native modules keep running. Both visible side by side.
2. **Author in ERPNext:** new customers/items/BOM/work orders are created in ERPNext; Shop-Management reads them.
3. **Per-domain cutover:** when a domain is fully in ERPNext, the native Prisma tables for it become read-only history; dashboards switch their source to the bridge.
4. **Identity federation (optional):** OAuth2/SSO so one login spans both apps.

No big-bang rewrite — each domain moves only when it's proven, and the data-scope boundary is enforced in code at every step.
