# Changelog

All notable changes to the Advanced Shop Management platform. Format follows
[Keep a Changelog](https://keepachangelog.com/); the project uses semantic
versioning (`MAJOR.MINOR.PATCH`). Each entry links to the slice commits.

Build provenance is live at `GET /version` (version, commit, build date) and
readiness at `GET /health`.

## [Unreleased]

### Added
- **Engineering foundation** — error-code catalog (`src/lib/error-codes.ts`,
  `MODULE-CODE` format, unit-tested), `GET /version` endpoint, this changelog,
  `docs/error-codes.md`, `docs/troubleshooting.md`, and the first ADRs.
- **External app links** (CRM, Document Portal, Company Photos) — env-driven,
  shown in the sidebar only when their URL env vars are set.
- **Twenty CRM + Papermark integration** — customer/proposal request forms that
  create records in Twenty CRM; proposal PDFs shared via Papermark with
  view/download analytics fed back; CRM activity dashboard. Env-gated, health-
  probed, admin status page, audit-logged (the standard bridge contract — ADR 0001).
- **Shipment notifications (ShipNotify)** — per-shipment QR + public confirm
  link, idempotent vendor/customer notification, print-CSS packing slip.

## [1.6.0] — Platform Blueprint
### Added
- Web-based Platform Blueprint module (`/blueprint`): six-phase roadmap, 14-area
  ERPNext fit-gap with the 10-step evaluation, four-environment architecture, and
  competitor differentiation vs ProShop/Fulcrum/JobBOSS/Global Shop Solutions.

## [1.5.0] — Shop-floor & helpdesk integrations
### Added
- Capacity Heatmap dashboard + reusable heatmap widget.
- Maintenance / CMMS module (machines, PM, work orders, MRO, downtime + dashboard).
- First-Piece run tracker (FPY board) + dashboard tie-in.
- Helpdesk SLA library (tested), ticket triage board, Support Desk dashboard.
- Shift Handoff module with maintenance machine-down sync + supervisor alerts.

## [1.4.0] — ERPNext bridge
### Added
- Read-only ERPNext integration bridge with operational-doctype allowlist,
  liveness probe, and admin status page (`/erp/integrations/erpnext`).

## [1.3.0] — ProShop sync & production readiness
### Added
- ProShop read-only mirror (sync engine, cron endpoint, observable sync runs,
  backlog dashboard, sync admin page).
- Railway production-readiness: startup env validation, `/health` readiness.
- Shop Floor Health dashboard; customer-facing PDF print templates.

## [1.2.0] — Dashboards & cycle-time feedback loop
### Added
- Declarative dashboard engine (registry + generic renderer + CSV/PDF export).
- WorkCenter capacity model; AdvancedCapacity, Scheduling, PK-Gantt, First-Piece,
  NPI, Sales-Advanced dashboards.
- Cycle-time feedback loop: JobActual → recompute → CycleTimeLookup
  (SEED → MANUAL → DERIVED), fed by operation completion.

## [1.1.0] — Quoting engine
### Added
- Manufacturing-aware quoting (material/process/complexity/diameter buckets),
  multi-line quotes, quote → sales order conversion, customer PDF.

## [1.0.0] — Initial platform
### Added
- Four-tier RBAC, tickets, onboarding, payroll coordination, approvals,
  recurring checklists, productivity board, SOP Knowledge Base assistant,
  Training/Assessments, and the ERP core (customers, parts, jobs, schedule,
  inventory, purchasing, shipping, quality).
