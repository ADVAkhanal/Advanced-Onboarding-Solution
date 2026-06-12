# Platform Blueprint (web-based)

The next-generation manufacturing ERP/MES design — ERPNext core + the
Shop-Management experience layer — is published **as a production module inside
the app**, not as a static document:

| Page | Content |
|---|---|
| `/blueprint` | Design philosophy, "already live" positioning, and the six-phase roadmap (Foundation ERP → MES → Quality & Traceability → APS → Portals → AI & Automation) — each phase with business value, features, dependencies, effort, upgrade impact, technical risk, maintenance burden, ROI, and implementation order. |
| `/blueprint/modules` | Fit-gap for all 14 required functional areas: every capability through the 10-step evaluation (native → configuration → custom doctype → workflow → scripting → custom app) with complexity / maintenance / upgrade-risk ratings and the most maintainable recommendation. |
| `/blueprint/architecture` | Dev / CI / staging / prod promotion path + infrastructure, database, backup, monitoring, security, and integration architectures with single-admin notes. |
| `/blueprint/competitors` | Module-by-module differentiation vs ProShop, Fulcrum, JobBOSS/E2, and Global Shop Solutions — edge + honest weakness per area. |

Access: `report:view` (MANAGER and up). Linked from the Operations Dashboards
index. The content is data-driven (`src/lib/blueprint/*`) — editing the data
files updates the published blueprint; no layout work needed.

Companion docs: `erpnext-integration.md` (the fork/bridge ADR this blueprint
builds on), `maintenance-module.md`, `first-piece-module.md`,
`shift-handoff-module.md`, `dashboards.md`, `quoting-engine.md`.
