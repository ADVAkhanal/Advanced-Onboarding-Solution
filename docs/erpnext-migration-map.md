# ERPNext Migration Map — Shop-Management → ERPNext (Frappe)

Status: **planning artifact** (no code migrated yet). This maps every
Shop-Management capability to one of three dispositions, so we never rebuild
what ERPNext already does and only invest custom effort where it is a genuine
shop differentiator.

- Skill installed: `~/.claude/skills/erpnext-skill` (Frappe/ERPNext v15 dev reference).
- Source app: Next.js 14 + TypeScript + Prisma + Postgres.
- Target: ERPNext (Frappe Framework — Python + MariaDB + Redis).

## Dispositions

| Tag | Meaning |
|-----|---------|
| **NATIVE** | ERPNext already does this. Configure/use it; migrate data only. Do **not** rebuild. |
| **CUSTOM** | Real shop differentiator with no ERPNext equivalent. Build as a Frappe custom app (`advanced_pmc`): DocTypes + controllers + client scripts + hooks. |
| **LAYER** | Keep in the Next.js app or an external tool (BookStack/Metabase/Papermark) and integrate via Frappe REST API. Not worth porting into Frappe. |

## Reality constraints (read before scheduling work)

1. **It is a reimplementation, not a port.** Prisma models → Frappe DocType JSON; TypeScript route logic → Python controllers/hooks; React pages → Frappe Desk forms/list views or Next.js calling the REST API. No automated conversion exists.
2. **A Frappe `bench` stack is required to build/verify** (Python, MariaDB, Redis, Node). This Windows box does not have it. Code + DocType JSON can be authored here; running/testing needs a Linux/WSL bench or a Frappe Cloud site.
3. **Data scope holds.** Per the platform's compliance posture, payroll/PII/CUI stay out of UI scope; HR/Payroll DocTypes are mapped but flagged as out-of-scope unless explicitly enabled.

---

## Core ERP — migrate to NATIVE (do not rebuild)

| Shop-Management (Prisma) | ERPNext native | Notes |
|--------------------------|----------------|-------|
| `CustomerAccount` | **Customer** (Selling/CRM) | Data import; map account number → custom field. |
| `VendorAccount` | **Supplier** (Buying) | AS9100 8.4 supplier qualification → custom fields on Supplier. |
| `Part` | **Item** (Stock) + `is_manufactured` | Revision → Item variant or custom field; `exportControlled` → custom check field. |
| `Quote` / `QuoteLine` | **Quotation** / Quotation Item | Manufacturing fields (material/process/complexity/diameter) → custom fields. |
| `SalesOrder` | **Sales Order** | Native quote→order conversion replaces the custom convert action. |
| `WorkOrder` | **Work Order** (Manufacturing) | Driven by BOM + routing. |
| `WorkOrderOperation` | **Job Card** / Operation | Native operation time logging feeds actuals. |
| `WorkCenter` | **Workstation** | Capacity/hour-rate native. |
| `InventoryItem` / `InventoryTransaction` | **Bin** / **Stock Entry** / Stock Ledger | Reorder level native (low-stock alert built in). |
| `PurchaseOrder` / lines | **Purchase Order** | Native. |
| `Receipt` | **Purchase Receipt** | Native. |
| `Shipment` | **Delivery Note** | Base for ShipNotify (see CUSTOM). |
| `QualityInspection` | **Quality Inspection** | Native, with templates/readings. |
| `NonconformanceRecord` | **Quality Inspection** + **Nonconformance** (Quality Mgmt) | Disposition workflow native. |
| `ApprovalRequest` / steps | **Workflow** + Workflow State + role actions | Replace custom approval engine with Frappe Workflows. |
| `Department`, `User`, RBAC (USER/MANAGER/DIRECTOR/ADMIN) | **Department**, **User**, **Role**, **Role Profile**, Permission Manager | Map four tiers to four Role Profiles. |
| Global Ctrl+K search (`/api/search`) | **Awesomebar / global search** | ERPNext ships this natively — drop the custom search. |
| Relationship Panel | **Connections / linked documents** tab | Native on every DocType — drop the custom panel. |
| ERPNext bridge (`src/lib/erpnext`) | n/a | Becomes the host; bridge retired. |
| Twenty CRM intake / portal | **CRM** (Lead/Opportunity/Customer) | Native CRM replaces Twenty; retire that integration. |

## Shop differentiators — build as CUSTOM (`advanced_pmc` Frappe app)

These are the reason to keep engineering effort. None exist in stock ERPNext.

| Capability | Frappe build | Effort |
|-----------|--------------|--------|
| **Cycle-time intelligence** (`CycleTimeLookup`: material × process × complexity × diameter → setup/cycle minutes) | Custom DocType `Cycle Time Lookup` + a server-side hook on Quotation Item / BOM Operation that auto-defaults setup & run time from the matching bucket. | M |
| **Actuals → estimate learning loop** (`JobActual`, auto-recompute lookup) | Hook on **Job Card** completion (native time logs) → upsert a `Job Actual` DocType → scheduled job recomputes `Cycle Time Lookup` averages with provenance. | M |
| **ShipNotify** (per-shipment QR, public confirm, packing slip) | Custom field `confirm_token` on Delivery Note + a **Frappe Web Page / portal route** for public confirmation + QR in the Print Format + a confirm controller. | M |
| **First-Piece / FPY tracker** | Custom DocType `First Piece Run` + Number Card for FPY %. (Partially overlaps native Quality Inspection.) | S |
| **Action Center** (cross-module "needs attention now") | **Workspace** + **Number Cards** + **Notification** rules; or a single `Operations Hub` Workspace with report-backed cards. Mostly configuration. | S |
| **Maintenance/CMMS extras** (downtime events, MRO min/max beyond Asset Maintenance) | Asset Maintenance is NATIVE; add custom `Downtime Event` DocType + MRO reorder report. | S |
| **Quoting margin / customer PDF** | Quotation is native; add a branded **Print Format** + margin custom fields. | S |

## Keep in the LAYER (Next.js / external; integrate via REST)

| Capability | Disposition |
|-----------|-------------|
| **SOP Knowledge Base + AI answerer** (Claude, citations, escalation) | Keep in Next.js (or move SOPs to **BookStack** per the OS plan). ERPNext has no grounded-AI SOP search. Integrate read-only. |
| **AI summaries / cost controls** (the H6 work) | Keep in the Next.js/AI layer; call ERPNext REST for source data. Frappe has no equivalent. |
| **Training / Assessments (QuizHub)** | **Frappe Learning (LMS)** app, or keep Next.js. Not core. |
| **Dashboards** (Sales-Advanced, Capacity Heatmap, NPI, etc.) | ERPNext Dashboards + Number Cards for simple ones; **Metabase** for cross-cutting analytics (per the OS plan). |
| **Helpdesk / Tickets** | **Frappe Helpdesk** app or native **Issue** DocType. |
| **Onboarding, Time-off, Attendance, Payroll coordination** | ERPNext **HR/Payroll** native — but gated by the data-scope boundary; enable only if the org opts in. |
| **ProShop sync** | ProShop remains system-of-record per the org; keep as a read-only integration (Frappe scheduled job or external connector). |
| **Papermark proposal tracking** | Keep as an integration; Frappe has no view-analytics equivalent. |

---

## Recommended approach (hybrid)

The disposition table makes the answer clear and matches the Machine Shop OS
philosophy ("don't rebuild what ERPNext solves; build the differentiators"):

1. **ERPNext = system of record** for all NATIVE rows above.
2. **`advanced_pmc` custom Frappe app** holds the CUSTOM differentiators only.
3. **Next.js app shrinks to the LAYER** — the operational/AI surface that calls
   ERPNext's REST API — rather than being retired wholesale.

A wholesale "port everything into a forked ERPNext" rebuilds large amounts of
functionality ERPNext already ships (search, connections, CRM, approvals,
stock alerts) — explicitly discouraged by the OS rules.

## Suggested phasing

| Phase | Work | Needs bench? |
|-------|------|--------------|
| 0 | Fork `frappe/erpnext` to your GitHub; stand up a bench site (WSL/Frappe Cloud). | yes |
| 1 | `bench new-app advanced_pmc`; scaffold the CUSTOM DocTypes (JSON authored here). | yes (to install) |
| 2 | Cycle-time intelligence + actuals loop (highest differentiator). | yes |
| 3 | ShipNotify on Delivery Note. | yes |
| 4 | Operations Hub Workspace + Number Cards (Action Center). | config |
| 5 | Point the Next.js LAYER at ERPNext REST; retire the in-app ERP modules. | no |

## Open decisions for you

1. **Build path** — Map-first (this doc) → which of: *ERPNext-as-backbone + Next.js layer* (recommended) vs *full port into the forked app*?
2. **Fork target** — confirm forking `frappe/erpnext` to your GitHub (needs `gh` auth) and where the bench site will live (WSL on this machine, a Linux server, or Frappe Cloud).
3. **HR/Payroll** — enable ERPNext HR (native) or keep out of scope per the data boundary?
