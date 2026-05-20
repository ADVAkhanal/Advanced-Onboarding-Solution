# Merge Discovery — Phase 0 Output

**Date:** 2026-05-20
**Authors:** Claude Code (Opus 4.7), under direction
**Status:** Complete; input to [`merge-plan.md`](./merge-plan.md)

---

## 0.1 — Goal

Merge five existing ADVANCED repositories into the canonical `Shop-Management` app (Next.js + Prisma + TypeScript) without losing valuable functionality, without weakening the security model already in the canonical, and without dragging the platform into CUI/PCI/CMMC scope.

This document is a faithful inventory. It does not prescribe. The prescription lives in [`merge-plan.md`](./merge-plan.md).

---

## 0.2 — Access reality at the start of work

| Repo | Stated URL | Accessibility (this session) | Notes |
| --- | --- | --- | --- |
| **Shop-Management** (canonical) | github.com/ADVAkhanal/Shop-Management | GitHub auth failure | Local working copy found at `C:/Users/Akhanal/Documents/Shop Management/`; used as merge destination. Git initialized locally on `2026-05-20`. |
| **Scheduling** | github.com/ADVAkhanal/Scheduling | Public, cloned | Pulled to `.workspace/sources/Scheduling/` |
| **AdvancedCapacity** | github.com/ADVAkhanal/AdvancedCapacity | Public, cloned | Pulled to `.workspace/sources/AdvancedCapacity/` |
| **First-Piece-Run-Tracker** | github.com/ADVAkhanal/First-Piece-Run-Tracker | Public, cloned | Pulled to `.workspace/sources/First-Piece-Run-Tracker/` |
| **Sales-Advanced** | github.com/ADVAkhanal/Sales-Advanced | GitHub auth failure | No local copy located; **deferred** to a later session per user decision. |
| **npi-dashboard** | github.com/ADVAkhanal/npi-dashboard | Public, cloned | Pulled to `.workspace/sources/npi-dashboard/` |

The GitHub `Shop-Management` repo could not be cloned; the merge target is the local working copy. The canonical was un-tracked when work began and was committed cleanly as the Phase 0 baseline.

---

## 0.3 — Canonical inventory: `Shop-Management` (advanced-shop-command-center)

### 0.3.1 — Stack

| Concern | Choice | Version | Notes |
| --- | --- | --- | --- |
| Framework | Next.js App Router | 14.2.23 | Route groups under `src/app/(platform)`; server components default |
| Language | TypeScript | 5.7.2 | Strict (see `tsconfig.json`) |
| ORM | Prisma | 5.22 | PostgreSQL; one initial migration `20260507093000_initial` |
| Database | PostgreSQL | 16 (CI) | Multi-tenant via `organizationId` on every model |
| Validation | Zod | 3.24 | Schemas in `src/lib/validators.ts`, parsed per route |
| Logger | Pino | 9.5 | `src/lib/logger.ts` |
| Auth hashing | bcryptjs | 2.4 | Cost 12 — see plan for argon2id migration recommendation |
| Sessions | HMAC-signed token in `httpOnly` cookie | — | 8-hour TTL, `SameSite=Lax`, `Secure` in prod |
| Icons | lucide-react | 0.468 | |
| Tests | Vitest | 2.1 | `tests/unit/*`, `tests/integration/*` |
| Format / lint | Prettier 3.4, ESLint 8.57 + `eslint-config-next` | — | Both wired into npm scripts |
| Deploy | Railway | — | `railway.json` present |
| CI | GitHub Actions | — | Runs `lint`, `typecheck`, `test`, `build` against a Postgres 16 service container |

### 0.3.2 — Directory layout

```
src/
  app/
    layout.tsx                       (root layout)
    login/page.tsx                   (login UI)
    (platform)/                      (auth-required route group)
      layout.tsx                     (loads user, mounts AppShell)
      page.tsx                       (executive dashboard)
      director/page.tsx
      manager/page.tsx
      employee/page.tsx
      tickets/page.tsx · [id]/page.tsx
      onboarding/page.tsx · [id]/page.tsx
      payroll/page.tsx
      reports/page.tsx
      workflows/[slug]/page.tsx      (catch-all for the rest of NAVIGATION)
    api/
      auth/{login,logout,me}/route.ts
      tickets/route.ts
      onboarding-cases/route.ts
      payroll/change-requests/route.ts
      time-off/route.ts
      attendance/issues/route.ts
      approvals/route.ts · [id]/decisions/route.ts
      reports/route.ts
      files/route.ts
      admin/readiness/route.ts
      health/route.ts
  components/
    app-shell.tsx                    (dark sidebar + dark topbar + workspace)
    dashboard-view.tsx               (12-KPI command dashboard)
    kpi-card.tsx
    login-form.tsx
    module-workbench.tsx             (placeholder workspace per nav slug)
  lib/
    auth.ts                          (session + permissions + getCurrentUser + requireUser)
    permissions.ts                   (34-key permission catalog, per-level defaults)
    audit.ts                         (recordAudit)
    http.ts                          (HttpError, ok, fail, handleRouteError, ZodError mapper)
    prisma.ts · logger.ts · validators.ts · numbering.ts · session-constants.ts · reference-data.ts · dashboard.ts
  middleware.ts                      (cookie-presence gate + public paths)
prisma/
  schema.prisma                      (≈80 models, all org-scoped)
  migrations/20260507093000_initial/
  seed.ts                            (reference seed — orgs, roles, depts, ticket centers, templates)
  seed-demo.ts                       (demo data — separated by intent)
scripts/
  generate-initial-migration.cjs
tests/
  unit/permissions.test.ts
  unit/validators.test.ts
  integration/health.test.ts
```

### 0.3.3 — Data model highlights

The Prisma schema already encodes the brief's spine:

- **Tenancy**: every model carries `organizationId`; uniqueness constraints scope by org.
- **Soft-delete**: every model has `archivedAt: DateTime?`.
- **Audit trail**: every model has `createdAt`, `updatedAt`, `createdById`, `updatedById`; many also have `ownerId` and `departmentId`.
- **Tier enum**: `UserLevel { LEVEL_1, MANAGER, DIRECTOR, GLOBAL_ADMIN }` — exactly the brief's four tiers.
- **RBAC**: `Role`, `Permission`, `UserRole`, `RolePermission` tables present.
- **ABAC primitive**: `VisibilityLevel { PRIVATE_TO_MANAGER, VISIBLE_TO_DIRECTOR, VISIBLE_TO_HR_ADMIN, VISIBLE_TO_EMPLOYEE, EXECUTIVE_RESTRICTED }` already in use on `TicketComment`, `OnboardingComment`, `LifecycleEvent`, `OneOnOneNote`, `ManagerNote`, `ProductivityTask`.
- **Audit log**: `AuditLog` with `actorId`, `entityType`, `entityId`, `outcome`, `reason`, `ipAddress`, `userAgent`, `before`, `after`.
- **Approval workflow**: `ApprovalRequest`, `ApprovalStep`, `ApprovalDecision`, `ApprovalRule`, `ApprovalEscalation`.
- **Safe-data primitives**: `EmployeeProfile.safeProfileSummary`, `PayrollExport.safeFieldSet`, `FileMetadata.safeUse`. There are **no** SSN, bank, card, or credential fields anywhere in the schema. This is consistent with the data-scope boundary.
- **Background work**: `ImportJob` / `ImportRow` for async imports.

Notable absent models (relative to brief): `Schedule`, `CapacityPlan`, `CapacityLoad`, `WorkCenter`, `FirstPieceInspection`, `RunRecord`, `SalesAccount`, `SalesOpportunity`, `SalesTask`, `NPIProject`, `NPIMilestone`, `ManagerRelationship`, `AIActionLog`, `Document` (generic), `IntegrationConfig`. The merge will add these.

### 0.3.4 — Request lifecycle convention (canonical)

Every API route follows the same shape:

```ts
export async function POST(request: Request) {
  try {
    const user = await requirePermission("ticket:create");            // 1. authn + permission
    const body = ticketCreateSchema.parse(await request.json());       // 2. Zod validation
    if (!canAccessDepartment(user, body.departmentId)) {               // 3. ABAC scope check
      throw new HttpError(403, "...", "department_scope_denied");
    }
    const created = await prisma.$transaction(async (tx) => { /* writes */ });   // 4. atomic write
    await recordAudit({ /* actor, entity, before/after, outcome */ }); // 5. audit log
    return ok({ ticket: created }, { status: 201 });                   // 6. response
  } catch (error) {
    return handleRouteError(error);                                    // 7. centralized error mapping (Zod, HttpError, 5xx fallback)
  }
}
```

This pattern is the merge contract: every module port adopts it. No exceptions.

### 0.3.5 — UI shell

`src/components/app-shell.tsx` + `src/app/globals.css` already implement the brief's UI reference:

- 264-px dark sidebar with brand block, nav with icon + label + optional badge, sidebar footer card, version stamp.
- 84-px dark topbar with title + search + user chip (bell, inbox, calendar, avatar).
- White workspace with internal-use disclaimer banner.
- KPI grid (6 cols → 3 cols → 1 col responsive), content-grid (main + right rail), three-col, two-col.
- Card / pill / table / bar-list / chart / donut / queue styles.
- Login screen split-pane.

The shell is **CSS-class-based** (no Tailwind, no shadcn). This is a deliberate constraint; it keeps the page bundle small and ships fast. The shared component library currently has 5 components; modules will need a handful more (DataTable, FormField, EmptyState, PageHead, Modal, Toolbar — listed in the merge plan).

### 0.3.6 — Permissions inventory (canonical)

34 keys in `src/lib/permissions.ts`. The brief asks for 35; differences and additions are catalogued in the merge plan. Permissions are mapped per `UserLevel` with `GLOBAL_ADMIN` granted everything.

### 0.3.7 — Constraints worth naming explicitly

1. **bcryptjs cost 12** is the current password hashing choice. The brief asks for argon2id-preferred. A migration is reasonable but should be a separate, opt-in pass — switching today would invalidate seeded admin credentials and require a rehash-on-next-login pathway.
2. **Middleware does not validate sessions** — only checks for cookie presence and redirects to `/login`. Full session validation runs in the route handlers via `requireUser()`. This is a deliberate edge-runtime separation (Prisma is not edge-safe). Sessions are still server-validated; the trade-off is one extra round-trip on a stale cookie.
3. **CSRF**: not explicit. The session uses `SameSite=Lax` cookies, which mitigates classic cross-site form posts. State-changing endpoints should add an explicit CSRF token or rely on the `Origin`/`Sec-Fetch-Site` header check. Plan flags this.
4. **Rate limiting**: not implemented yet. Plan adds it for auth and sensitive endpoints.
5. **Security headers**: not configured in `next.config.mjs`. Plan adds them.
6. **File uploads**: `uploadRules` constants in `validators.ts` define `allowedMimeTypes` and `maxBytes`; the `/api/files` route is the gate. Anti-malware hook is not yet wired.
7. **Audit log tamper resistance**: writes go through `recordAudit`, but there's no append-only enforcement at the DB level (no triggers blocking `UPDATE`/`DELETE`). Plan addresses this.
8. **AI layer**: not present. Plan adds it as a new subsystem.

---

## 0.4 — Source repo inventory

### 0.4.1 — `Scheduling` (actually: MPS Capacity Dashboard, v1)

| Item | Value |
| --- | --- |
| `package.json` name | `mps-dashboard` |
| Description | "Advanced Machining & Fab — Master Production Schedule Dashboard" |
| Stack | Express 4 + `pg` + Multer + `xlsx` + Compression + CORS; vanilla JS frontend |
| Files | `server.js` (333 lines) · `public/index.html` (1070 lines, monolithic) · `package.json` · `railway.json` |
| Tables | `mps_datasets`, `mps_months`, `mps_workcenters`, `mps_wc_months`, `mps_workorders` |
| Features | Excel capacity upload, Excel load upload, one-permanent-dataset model, fixed 24-month horizon (Jan 26 → Dec 27), `/api/datasets/latest/data`, work-order list with must-leave / customer-due dates |
| UI views | Year tabs (2026/2027/total) · bar vs line views |
| Notes | **The repo is named "Scheduling" but does not implement employee scheduling.** It is a manufacturing capacity / MPS dashboard. The brief's "Scheduling" functional spec (shifts, time-off coverage, schedule conflicts, manager approval routing) is a separate concept that is **already** seeded in the canonical schema (`Shift`, `TimeOffRequest`, `ScheduleIssueRecord`, `AttendanceIssueRecord`). |

### 0.4.2 — `AdvancedCapacity` (MPS Capacity Dashboard, v2 — the refined twin)

| Item | Value |
| --- | --- |
| `package.json` name | `mps-dashboard` (same as Scheduling) |
| Description | Same |
| Stack | Same as Scheduling |
| Files | `server.js` (402 lines) · `public/index.html` (1137 lines) · `package.json` · `railway.json` · `Package lock` (note: filename has a space) |
| Tables | Identical to Scheduling |
| Features over Scheduling | Dynamic month detection from the spreadsheet header (no more 24-month hardcode); multi-dataset support (no "one permanent dataset" lock-in); a deliberate local-date fix that prevents work-order dates from sliding a day on UTC conversion |
| UI views | Heatmap (axis/type/flat × util%/load) · WC gauges · Axis gauges · Type gauges · Customer load · WO schedule · Upload data; axis filter chips; year filter (all/2026/2027) |
| Notes | This is the **better** implementation. Treat `AdvancedCapacity` as the source of truth and import Scheduling's "one permanent dataset" toggle as an optional admin setting. |

### 0.4.3 — `First-Piece-Run-Tracker` (FPY Tracker)

| Item | Value |
| --- | --- |
| `package.json` name | `fpy-tracker` |
| Description | "First Pass Yield Tracker – Advanced Machining & Fab Inc" |
| Stack | Express 4 + `pg` (no `xlsx`, no auth, no multer); vanilla JS frontend |
| Files | `server.js` (135 lines) · `public/index.html` (829 lines) · `package.json` · `package-lock.json` · `README.md` |
| Tables | `fpy_entries(id, wo, date, part_number, customer, wc, run_num, op_num, inspection_method, setup_tech, status, result, defect_code, timestamp, edited_at)` |
| Features | CRUD on entries, print-friendly HTML export with FPY (First Pass Yield %) computation, clear-all, defect-code tracking, status/result enums (Pass/Fail/Pending) |
| Notes | Stores **inspection records**, not "first piece" specifically — the form captures every operation's first-piece check plus run-time inspections. Field set is mostly metadata, no part drawings, no tolerances — stays out of CUI/ITAR scope. The print export is the user's primary daily artifact; preserve it. |

### 0.4.4 — `npi-dashboard` (Real-time Shop-Floor Display)

| Item | Value |
| --- | --- |
| `package.json` name | `npi-dashboard` |
| Description | "NPI Live Dashboard - Real-time shop floor display" |
| Stack | Express 4 + `ws` (WebSockets); **no database** (`data.json` file-backed) |
| Files | `server.js` (115 lines) · `dashboard.html` (675 lines) · `package.json` · `Procfile` |
| Schema | Implicit; entries have `{ id, wo, partNumber, customer, wc, run, op, opStartDate, dmaxLab?, status, result, engQcDetail?, setupTech }` |
| Features | WS-broadcast adds/updates/deletes to all connected clients, file-backed JSON persistence, full-page sortable table with edit modal, CSV export |
| Notes | **This is not an NPI project tracker.** It is a real-time display layer over the same conceptual data set as `First-Piece-Run-Tracker`, with the addition of `opStartDate` and `DMAX/LAB` fields and live multi-user updates. The brief's "NPI Dashboard" functional spec (project tracking, milestones, readiness scoring, cross-functional blockers) is **not present in this repo** and needs to be designed fresh on top of the canonical's existing `ApprovalRequest` / `ProductivityTask` / `LifecycleEvent` primitives. |

### 0.4.5 — `Sales-Advanced`

Source unavailable this session. Module deferred. The canonical reserves `SalesAccount`, `SalesOpportunity`, `SalesTask` entity slots and `sales:read` / `sales:manage` permission slots in the plan so migrations don't churn when the source lands.

---

## 0.5 — Overlap & conflict analysis

### 0.5.1 — Module overlaps (sources)

| Conceptual surface | Sources contributing | Recommendation |
| --- | --- | --- |
| **Manufacturing capacity / MPS** | `Scheduling` (v1) + `AdvancedCapacity` (v2) | Merge to ONE module `capacity-mps`, take AdvancedCapacity as canonical implementation, preserve Scheduling's single-dataset toggle as admin option. |
| **First-piece / run inspection records** | `First-Piece-Run-Tracker` (DB-backed CRUD + print export) + `npi-dashboard` (WS real-time + extra fields) | Merge to ONE module `first-piece-runs`, take FPY's schema as canonical, add `opStartDate` and `dmaxLab` columns, add WS live-update channel as an optional dashboard view. |
| **Employee scheduling** (brief) | None of the source repos | Build new on the canonical's existing `Shift` / `TimeOffRequest` / `ScheduleIssueRecord` primitives. |
| **NPI project tracking** (brief) | None of the source repos | Build new on the canonical's existing `ApprovalRequest` / `ProductivityTask` / `LifecycleEvent` primitives. |
| **Sales / pipeline / accounts** | Source repo inaccessible | Defer. Reserve entity slots and permissions. |

### 0.5.2 — Naming collisions to resolve

| Source name | Source meaning | Canonical / target name |
| --- | --- | --- |
| "Scheduling" (repo) | Master production schedule capacity | **Capacity & MPS module** (route slug `capacity-mps`) |
| "AdvancedCapacity" (repo) | Same | Folded into Capacity & MPS |
| "npi-dashboard" (repo) | First-piece live display | **First-Piece & Runs module** (route slug `first-piece-runs`); real-time display becomes a sub-view |
| "Scheduling" (brief functional spec) | Employee shifts + time-off coverage | **Scheduling module** (route slug `scheduling`) — new, built on existing canonical primitives |
| "NPI Dashboard" (brief functional spec) | Project / milestone / readiness tracking | **NPI Projects module** (route slug `npi-projects`) — new |
| `mps_workorders.wc` (source) | Work-center text key | `WorkCenter.code` (new canonical entity, org-scoped) |
| `fpy_entries.wo` (source) | Work order number (flat text) | `WorkOrder.number` (proposed new canonical entity OR retain as denormalized text on `FirstPieceInspection`) |

### 0.5.3 — Convention divergences (canonical ↔ source)

| Concern | Canonical | Sources | Resolution |
| --- | --- | --- | --- |
| Language | TypeScript | JavaScript | Port to TypeScript; the source code is small enough that direct rewrite is faster than a JS-interop bridge. |
| HTTP framework | Next.js App Router | Express | Reimplement as Next.js route handlers using the canonical's `requirePermission` / `Zod` / `recordAudit` pattern. |
| DB access | Prisma | Raw `pg` queries | Reimplement against Prisma models (new schema additions documented in the plan). |
| Auth | Signed-cookie session, RBAC | None | All ported endpoints become `requirePermission(...)`-gated. |
| Tenancy | `organizationId` everywhere | Single-tenant | New models add `organizationId`. |
| Validation | Zod | None | Every ported endpoint gets a Zod schema. |
| Audit | `recordAudit` | None | Mutations write audit entries (create/update/delete on uploads, work-order changes, inspection edits). |
| Frontend | React Server Components + CSS classes in `globals.css` | Vanilla JS + inline `<style>` per page | Reimplement views as RSC + small client components; preserve UI affordances (heatmap, gauges, sortable tables, edit modals, print export). |
| Numbers | `cuid()` PKs | `SERIAL` / `BIGSERIAL` PKs | New canonical models use `cuid()`. Import scripts can preserve source row IDs as a `legacySourceId String?` column for traceability. |
| Tests | Vitest | None | Add smoke + permission + Zod tests for each ported module. |

### 0.5.4 — Data-scope cross-check

The source repos are operationally clean from a data-scope perspective:

- No source repo stores SSNs, bank info, card data, payroll credentials, medical records, PHI, or background checks.
- The MPS repos handle work-order metadata (WO number, part number, customer, work-center, status, hours) — none of this is CUI by itself; part drawings and tolerances are **not** in the schema. The plan keeps it that way.
- FPY tracker stores `inspection_method` and `defect_code` as freeform text. Documentation must flag that operators must not paste regulated technical content (drawing dimensions, ITAR-controlled specs) into these fields; a textbox is not a vault.
- `npi-dashboard` stores entries in a flat JSON file. Migrating to the canonical Postgres + audit-logged path is a strict improvement.

---

## 0.6 — What's already great and should be preserved

- Canonical's permission catalog + `requirePermission` shape is **the** module contract.
- Canonical's soft-delete / `archivedAt` pattern.
- Canonical's `organizationId`-scoped uniqueness constraints.
- Canonical's `VisibilityLevel` enum — exactly the manager-private / director-visible / HR-visible spectrum the brief asks for.
- `AdvancedCapacity`'s dynamic month detection — keep verbatim, port to TS.
- `AdvancedCapacity`'s local-date fix — keep verbatim; document why (UTC slippage burns hours on shop-floor data).
- FPY tracker's print-friendly HTML export with FPY% computation — preserve the layout, swap the generator to a Next.js route that returns the same self-contained HTML.
- `npi-dashboard`'s live WS update model — preserve as an opt-in dashboard view; Next.js supports server-sent events natively, no need to introduce `ws` as a dependency.

---

## 0.7 — Phase 0 closing checklist

- [x] Canonical inspected (stack, schema, conventions, security primitives, UI shell, CI)
- [x] All four accessible source repos cloned and inventoried
- [x] Sales-Advanced access confirmed unavailable; deferral approved
- [x] Conventions and naming conflicts catalogued
- [x] Data-scope walls re-checked against every source
- [x] `merge-discovery.md` written
- [ ] `merge-plan.md` written (see [`merge-plan.md`](./merge-plan.md))
