# Merge Plan — Phase 0 Output

**Date:** 2026-05-20
**Companion to:** [`merge-discovery.md`](./merge-discovery.md)
**Status:** This is the prescription. Phase 1+ executes against it.

---

## 1 — Stack decision

**Keep the canonical stack as-is.** Next.js 14 App Router + Prisma + TypeScript + Zod + Pino + Vitest + Railway is a mainstream, modern, fast stack. The source repos are vanilla Express + raw SQL + monolithic HTML; rewriting them into the canonical stack is **less work** than standing up a polyglot interop layer, and yields a single coherent codebase.

**No new dependencies in Phase 1.** Additions happen at the module that needs them, with justification:

| Phase | New dependency | Why |
| --- | --- | --- |
| P3 Capacity | `xlsx` | Already required to parse the existing capacity / load Excel uploads; no canonical alternative. |
| P3 Capacity | `multer`-equivalent (Next.js `formData()` is sufficient) | Avoid adding `multer`; Next.js's built-in `Request.formData()` covers the upload path. |
| P3 First-Piece | none | The WS live-update view is reimplemented as Server-Sent Events using Next.js `Response` streams. No `ws` dependency. |
| P5 AI | `@ai-sdk/openai` (provider) and/or `openai` SDK | Behind a provider abstraction; configurable. |
| P2 hardening | `argon2` *(optional — see §6)* | Strong KDF; rolling migration from bcryptjs on next login. |
| P2 hardening | `next-rate-limit` or a small token-bucket impl | Brief requires rate limiting on auth and sensitive endpoints. |

---

## 2 — Target module structure

The canonical does not currently have a `modules/` folder. We introduce one for module-owned routes, components, lib helpers, and tests:

```
src/
  app/
    (platform)/                          (the existing auth-required route group)
      capacity-mps/                      (new — replaces Scheduling + AdvancedCapacity)
      first-piece-runs/                  (new — replaces First-Piece-Run-Tracker + npi-dashboard)
      scheduling/                        (new — employee scheduling, built on Shift/TimeOffRequest)
      npi-projects/                      (new — built on ApprovalRequest/ProductivityTask/LifecycleEvent)
      sales/                             (placeholder — source deferred)
      ...existing routes unchanged...
    api/
      capacity-mps/                      (datasets, work-centers, uploads)
      first-piece-runs/                  (entries, exports, SSE stream)
      scheduling/                        (shifts, coverage, time-off)
      npi-projects/                      (projects, milestones, blockers)
      sales/                             (stubs for forward compatibility)
      ...existing routes unchanged...
  modules/
    capacity-mps/
      lib/                               (parseCap, parseLoad, dataset helpers)
      components/                        (HeatMap, WCGauge, CustomerLoad, WOSchedule, UploadDialog)
      schemas.ts                         (Zod input/output)
    first-piece-runs/
      lib/                               (FPY computation, print export)
      components/                        (EntryTable, EntryFormModal, LiveView)
      schemas.ts
    scheduling/
      lib/                               (coverage planning, conflict detection)
      components/                        (WeekGrid, ShiftCard, CoverageAlerts)
      schemas.ts
    npi-projects/
      lib/                               (readiness score, blocker rollup)
      components/                        (ProjectBoard, MilestoneList, ReadinessGauge)
      schemas.ts
    sales/
      lib/                               (placeholder)
      schemas.ts                         (reserved)
    ai/
      provider.ts                        (provider abstraction)
      redaction.ts                       (out-of-scope field stripper)
      audit.ts                           (AIActionLog writer wrapper)
      schemas.ts
  components/                            (shared UI primitives — extended)
  lib/                                   (existing shared)
```

Module boundaries are physical: a module owns its routes, lib code, components, and tests. Module → core is the only allowed dependency direction; module → module imports go through a shared interface in `src/lib/`.

---

## 3 — Module-by-module disposition

For each of the brief's five "modules," the table below states: what source we use, what we preserve, what we rewrite, what we retire, and why.

### 3.1 — Capacity & MPS (merges `Scheduling` + `AdvancedCapacity`)

| Item | Decision | Reason |
| --- | --- | --- |
| Source code | **Rewrite** (port to TS/Next.js/Prisma) | Express + raw SQL + vanilla JS doesn't compose with the canonical's middleware. The two repos are ≈ 700 lines combined; rewrite is faster than interop. |
| Excel parsers (`parseCap`, `parseLoad`) | **Preserve verbatim** (port to TS, no behavior change) | These are correct and battle-tested against the operator's spreadsheets. They contain the local-date fix and the dynamic month detection logic that is non-trivial. |
| Schema `mps_datasets / mps_months / mps_workcenters / mps_wc_months / mps_workorders` | **Normalize** into Prisma models: `CapacityDataset`, `CapacityMonth`, `WorkCenter` (org-scoped), `CapacityWorkCenterMonth`, `WorkOrder` | Multi-tenant, soft-delete, audit-friendly; `WorkCenter` becomes a first-class entity referenced by other modules. |
| One-permanent-dataset philosophy (Scheduling) | **Preserve as admin option** `capacity.singleDatasetMode: boolean` | Some operators prefer it; making it a setting beats two divergent code paths. |
| Dynamic month detection (AdvancedCapacity) | **Preserve verbatim** | The 24-month hardcode is fragile; dynamic detection works for any horizon the spreadsheet contains. |
| Heatmap / gauges / customer load / WO schedule views | **Rewrite** as RSC pages using existing `card`, `bar-list`, `table`, `pill` classes; add component primitives for `HeatMap`, `Gauge`, `Donut` | Existing inline HTML is monolithic; clean component decomposition pays off as views grow. |
| `xlsx` dependency | **Adopt** (already in source; no canonical equivalent) | Standard, audited, widely used. |
| `multer` upload middleware | **Retire** in favor of Next.js `Request.formData()` | Smaller surface, no extra dependency. |
| Uploads logged to audit | **Add** (new) | Source had no audit. `capacity.dataset.upload` audit entries with row/column counts. |
| Permission gate | **Add** `capacity:read`, `capacity:upload`, `capacity:manage` | Source had no auth. |
| Tests | **Add** Zod tests for upload payload, permission tests for capacity routes, smoke test for `parseCap` + `parseLoad` on a fixture spreadsheet | Source had no tests. |

### 3.2 — First-Piece & Runs (merges `First-Piece-Run-Tracker` + `npi-dashboard`)

| Item | Decision | Reason |
| --- | --- | --- |
| FPY tracker CRUD | **Rewrite** as Next.js + Prisma routes | Same Next.js-can't-call-Express reason. |
| FPY schema (`fpy_entries`) | **Normalize** to `FirstPieceInspection { id, organizationId, workOrderId/woNumber, partNumber, customer, workCenterId, runNumber, operationNumber, inspectionMethod, setupTechId/setupTechName, status, result (Pass/Fail/Pending), defectCode, opStartDate, dmaxLab, engQcDetail, ... + standard audit columns }` | Adds the two fields `npi-dashboard` had (`opStartDate`, `dmaxLab`) and the eng/QC detail textbox; both gain everything the canonical demands (org scope, audit columns). |
| `npi-dashboard` JSON-file persistence | **Retire** | A flat JSON file shared by multiple operators is a race-condition factory. Postgres + WS-equivalent SSE is a strict improvement. |
| WebSocket real-time broadcast | **Reimplement** as Server-Sent Events stream at `GET /api/first-piece-runs/stream` | SSE is built into Next.js, one-direction (server → client), and survives reverse proxies more reliably than WS. Live floor display preserved. |
| Print-friendly HTML export with FPY% | **Preserve verbatim** (port template to a Next.js route that returns HTML) | The shop uses this daily. Layout, columns, and computation stay identical. |
| Defect-code freeform | **Preserve** as freeform but **add** a `defectCodes` admin-config table for optional dropdown enforcement | Operators can keep typing; admins can lock it to a list per dept. |
| Permission gate | **Add** `first_piece:create`, `first_piece:read:department`, `first_piece:read:all`, `first_piece:approve`, `first_piece:export` | Source had no auth. |
| Operator/manager signoff (per brief) | **Add** `signedOffById` + `signedOffAt` columns; approval routed through `ApprovalRequest` | Brief explicitly requires manager signoff; canonical already has the approval infra. |
| Tests | **Add** Zod + permission + FPY computation tests | |

### 3.3 — Scheduling (employee scheduling — **new module**, no source code)

| Item | Decision | Reason |
| --- | --- | --- |
| Source repo | **None used** (repo of this name implements MPS, not scheduling) | See discovery §0.5.2. |
| Schema | **Add** `Schedule`, `SchedulePeriod`, `ScheduleAssignment` Prisma models on top of existing `Shift`, `TimeOffRequest`, `ScheduleIssueRecord`, `AttendanceIssueRecord`, `EmployeeProfile`, `Department` | Canonical already has the leaf primitives; we add the period/assignment layer. |
| Features (per brief) | Team schedules, shift management, time-off visibility, coverage planning, schedule conflicts, manager approval routing | Built fresh on canonical primitives. |
| Permission gate | **Add** `schedule:read:self`, `schedule:read:department`, `schedule:manage:department` | Brief catalog. |
| Manager approval routing | **Reuse** canonical `ApprovalRequest` + `ApprovalRule` | No new approval infra needed. |
| Tests | Zod + permission + smoke flow (publish a week, employee swaps, manager approves) | |

### 3.4 — NPI Projects (project tracking — **new module**, no source code)

| Item | Decision | Reason |
| --- | --- | --- |
| Source repo | **None used** (`npi-dashboard` repo is first-piece live display, not project tracking) | See discovery §0.4.4. |
| Schema | **Add** `NPIProject`, `NPIMilestone`, `NPIBlocker`, `NPIReadinessScore` (computed) | Brief: project tracking, milestones, engineering/manufacturing readiness, cross-functional blockers, launch readiness score, department ownership. |
| Existing canonical reuse | `ApprovalRequest`, `ProductivityTask`, `LifecycleEvent`, `Blocker`, `Escalation` are reused for blockers/tasks/escalations within projects | No need to duplicate. |
| Permission gate | **Add** `npi:read`, `npi:manage` | Brief catalog. |
| Tests | Zod + permission + readiness-score computation + scope tests | |
| Out-of-scope guard | **Document** that engineering documents linked to projects must use `FileMetadata.safeUse` tagging; no part drawings stored inline | Data-scope wall. |

### 3.5 — Sales (deferred)

| Item | Decision | Reason |
| --- | --- | --- |
| Source repo | **Inaccessible** this session | See discovery §0.2. |
| Module | **Stub** route + nav link + "Coming soon — source merge pending" notice | Preserves navigation slot, breaks no migrations. |
| Schema | **Reserve** `SalesAccount`, `SalesOpportunity`, `SalesTask` slot names (do **not** add models until source is read) | Avoid speculative schema; brief says don't introduce abstractions for hypothetical requirements. |
| Permissions | **Reserve** `sales:read`, `sales:manage` slots in the catalog (not assigned to any level until source arrives) | |
| Out-of-scope guard | When the source lands: **explicitly verify** no card/PCI flows are imported. Quote/order flows are OK; payment processing is not. | Data-scope wall. |

---

## 4 — Canonical primitive additions (cross-cutting)

These are not module-specific; they're the new spine elements the brief needs and the merge calls for.

### 4.1 — Schema additions

| Model | Why | Where |
| --- | --- | --- |
| `WorkCenter` | Make work-center a first-class org-scoped entity rather than freeform text repeated across MPS rows and FPY rows. References by code/id from Capacity, First-Piece, Scheduling, NPI. | Capacity merge |
| `WorkOrder` (optional) | If we want WO to be a real entity rather than a duplicated string column. Decision: **defer to a follow-up**; for now, keep WO number as text on `WorkOrder`-referencing models so the merge ships. Add an entity later if multiple modules need to dedupe. | Document as follow-up |
| `CapacityDataset`, `CapacityMonth`, `CapacityWorkCenterMonth` | Replace `mps_*` tables in Prisma. | Capacity merge |
| `FirstPieceInspection` | Replaces `fpy_entries`. Adds `opStartDate`, `dmaxLab`, `engQcDetail`, `signedOffById`, `signedOffAt`. | First-Piece merge |
| `Schedule`, `SchedulePeriod`, `ScheduleAssignment` | New scheduling module surface. | Scheduling new |
| `NPIProject`, `NPIMilestone`, `NPIBlocker` | New NPI module surface. | NPI new |
| `ManagerRelationship` | Brief explicitly lists it; canonical has `managerId`/`directorId` on `User` and `EmployeeProfile` but no history of relationship changes. Add for grant-history and effective-date tracking. | P2 |
| `AIActionLog` | Logs every AI call (prompt class, user, scope, provider, model, redaction applied — not raw prompt content unless policy permits). | P5 AI |
| `IntegrationConfig` | Admin-configurable provider keys/endpoints (with secret references, not raw secrets). | P5 admin |
| `Document` (generic) | Brief asks for a Document Center; canonical only has `OnboardingDocument`. Add a generic `Document` linking via `FileMetadata` with category/retention. | P4 admin / docs |

All new models follow the canonical pattern: `organizationId`, `createdAt`, `updatedAt`, `createdById`, `updatedById`, `archivedAt`, indexes on `(organizationId, ...)`, `@@map` to snake_case.

### 4.2 — Permission catalog additions

The brief's 35-key catalog is broader than the canonical's 34. The merge consolidates to a single canonical list. Additions (with proposed defaults per level):

| Permission | LEVEL_1 | MANAGER | DIRECTOR | GLOBAL_ADMIN |
| --- | --- | --- | --- | --- |
| `ticket:read:self` | ✓ | — | — | ✓ |
| `ticket:read:department` | — | ✓ | ✓ | ✓ |
| `ticket:read:all` | — | — | ✓ | ✓ |
| `ticket:update:assigned` | ✓ | ✓ | ✓ | ✓ |
| `ticket:update:department` | — | ✓ | ✓ | ✓ |
| `ticket:close` | — | ✓ | ✓ | ✓ |
| `people:read:self` | ✓ | ✓ | ✓ | ✓ |
| `people:read:department` | — | ✓ | ✓ | ✓ |
| `people:read:all` | — | — | ✓ | ✓ |
| `payroll_coordination:export_safe` | — | — | ✓ | ✓ |
| `schedule:read:self` | ✓ | ✓ | ✓ | ✓ |
| `schedule:read:department` | — | ✓ | ✓ | ✓ |
| `schedule:manage:department` | — | ✓ | ✓ | ✓ |
| `capacity:read:department` | — | ✓ | ✓ | ✓ |
| `capacity:upload` | — | — | ✓ | ✓ |
| `capacity:manage` | — | — | — | ✓ |
| `first_piece:create` | ✓ | ✓ | ✓ | ✓ |
| `first_piece:read:department` | — | ✓ | ✓ | ✓ |
| `first_piece:read:all` | — | — | ✓ | ✓ |
| `first_piece:approve` | — | ✓ | ✓ | ✓ |
| `first_piece:export` | — | ✓ | ✓ | ✓ |
| `sales:read` *(reserved)* | — | — | — | — |
| `sales:manage` *(reserved)* | — | — | — | — |
| `npi:read` | — | ✓ | ✓ | ✓ |
| `npi:manage` | — | ✓ | ✓ | ✓ |
| `admin:integrations` | — | — | — | ✓ |
| `audit:read` | — | — | — | ✓ |
| `ai:use` | — | ✓ | ✓ | ✓ |
| `ai:configure` | — | — | — | ✓ |

Existing keys are kept; some are renamed for the scoped-pattern naming convention used above. A rename map will be written into a Prisma migration so seeded data updates cleanly.

### 4.3 — Audit-log tamper resistance

Add a Postgres trigger blocking `UPDATE` and `DELETE` on `audit_log` rows (allow `INSERT` only). Admin overrides write a new audit entry; they never modify existing ones. The trigger is part of a Prisma migration; documented in `security-model.md`.

### 4.4 — CSRF + rate limiting + security headers

| Concern | Plan |
| --- | --- |
| CSRF | Issue a per-session double-submit token on login; require it in `X-CSRF-Token` header for `POST`/`PUT`/`PATCH`/`DELETE` from same-origin form contexts. Allow API token alternative for programmatic clients. Implemented in `src/lib/csrf.ts`. |
| Rate limit (auth) | Token bucket keyed on IP + email for `/api/auth/login`: 5 attempts / 5 minutes. |
| Rate limit (sensitive) | Token bucket keyed on userId for `payroll/*`, `admin/*`, `files`, capacity uploads. |
| Security headers | Configure in `next.config.mjs` `headers()`: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` lockdown. |
| File upload AV hook | Add an interface `scanUpload(stream): Promise<{ clean: boolean, reason?: string }>` with a no-op default + plug points for ClamAV / VirusTotal. Document in `security-model.md` that no production deployment should run without a real scanner wired up. |

### 4.5 — AI layer (P5)

- `src/modules/ai/provider.ts` — provider abstraction. Configured providers come from `IntegrationConfig`. Default: a no-op stub provider that returns deterministic placeholder summaries, so the build is green without external API keys.
- `src/modules/ai/redaction.ts` — given a payload object and a record-class hint, returns a sanitized copy with every out-of-scope field stripped (using a denylist sourced from the data-boundary doc). The redactor is the *only* path payloads take to leave the system; provider calls cannot bypass it.
- `src/modules/ai/audit.ts` — wraps every provider call; writes an `AIActionLog` entry with user, scope, provider, model, prompt-class, redaction-applied-flag (not raw prompt content unless `ai.persistPromptContent` setting is on, which defaults to off).
- AI features ship with **visible labels** in the UI ("AI-generated summary — review before acting") and require human acknowledgement before any workflow change is applied.

---

## 5 — Migration strategy

- **One migration per phase**, named by purpose:
  - `2026XXXXX_capacity_module` (Capacity tables + permission renames + audit-log trigger)
  - `2026XXXXX_first_piece_module` (FirstPieceInspection)
  - `2026XXXXX_scheduling_module` (Schedule + SchedulePeriod + ScheduleAssignment + ManagerRelationship)
  - `2026XXXXX_npi_module` (NPIProject + NPIMilestone + NPIBlocker)
  - `2026XXXXX_ai_layer` (AIActionLog + IntegrationConfig)
  - `2026XXXXX_documents` (Document + retention)
- **No destructive renames on existing tables**; add columns, mark obsolete columns with comment, drop in a separate cleanup migration once data is moved.
- **Permission key renames** ship a data migration: old key rows updated to new key rows, role assignments preserved.
- **Seed updates**: `prisma/seed.ts` extended (not rewritten) per phase to add new permission keys, departments, work-center seeds, and module-specific reference data.

---

## 6 — Security upgrades not strictly required for the merge but recommended

These do not block Phase 1–3 but are tracked here so the brief's hardening goals are not silently dropped:

1. **argon2id migration**: add `argon2` dep; rehash on next login; remove `bcryptjs` once all users have rehashed. Estimated: half-day work, low risk because both algorithms can coexist during the transition.
2. **Passkey / WebAuthn**: requires a relying-party id and stable origin; defer to a deployment-shape decision. Architecture is straightforward (`@simplewebauthn/server` + `@simplewebauthn/browser` integrate cleanly with the existing session model).
3. **SSO-ready architecture**: the session layer already abstracts user lookup behind `getCurrentUser()`; an OIDC plug-in slot is straightforward when an IdP is named.

---

## 7 — Execution order (definitive)

The brief's order (Scheduling → Capacity → First-Piece → Sales → NPI) is reordered to match dependency reality:

1. **Phase 1** — Shared component primitives + nav surface for new modules (`PageHead`, `DataTable`, `FormField`, `Modal`, `EmptyState`, `Toolbar`).
2. **Phase 2** — Security hardening (CSRF, rate limit, headers, audit-log trigger, `ManagerRelationship`, ABAC helpers extended, `AIActionLog`+`IntegrationConfig` model only — wiring in P5).
3. **Phase 3a** — **Capacity & MPS** module (Scheduling + AdvancedCapacity merge).
4. **Phase 3b** — **First-Piece & Runs** module (FPY tracker + npi-dashboard merge).
5. **Phase 3c** — **Scheduling** module (new, on canonical primitives).
6. **Phase 3d** — **NPI Projects** module (new).
7. **Phase 3e** — **Sales** placeholder stub.
8. **Phase 4** — Admin/customization surfaces filled in for the new modules.
9. **Phase 5** — AI layer wired into 3–4 highest-value features (dashboard summaries, manager weekly digest, anomaly hints).
10. **Phase 6** — Lint, typecheck, tests, build green.
11. **Phase 7** — Documentation pass.

Each phase commits in a single logical commit (or a tight series).

---

## 8 — Non-goals (to keep us out of trouble)

- No CUI/ITAR/EAR data ever enters this system. Modules touching engineering data (NPI, first-piece) must rely on `FileMetadata.safeUse` tagging; no part drawings, no controlled dimensions stored inline.
- No PCI scope. Sales workflows track quote/order **metadata** only; payment processing is explicitly out of scope.
- No PHI, no SSN, no banking, no payroll-processor credentials. Payroll is coordination + safe export only.
- No AI feature ships without redaction-by-default + audit logging + visible labelling.
- No frontend-only access control. Server-side enforcement on every API route.
- No compliance claims the system has not earned.

---

## 9 — Open questions (recorded; not blocking)

1. **GitHub Shop-Management and Sales-Advanced access** — when these are unlocked, Sales merge can begin; for Shop-Management, a `git remote add origin ...` + push of the locally re-initialized history is the cleanest path.
2. **Production deployment hostname** — drives CSP and CORS configuration; can be set as env var.
3. **AI provider** — OpenAI, Anthropic, Azure OpenAI, local Ollama; provider abstraction supports all four; need user to nominate one for the first deploy.
4. **Passkey/WebAuthn** — owner must confirm before this lands; current local-auth path stays.
5. **Anti-malware integration** — production deploys should not run without a real scanner wired into `scanUpload`.

These are noted; none blocks Phase 1–3. Each will surface in the relevant phase's commit notes.
