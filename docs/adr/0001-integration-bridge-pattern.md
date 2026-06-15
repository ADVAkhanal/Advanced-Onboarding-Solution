# 0001 — Integration bridge pattern (env-gated, observable, least-privilege)

Date: 2026-06-15
Status: Accepted

## Context

The platform integrates with external systems of record (ProShop, ERPNext, and
now Twenty CRM + Papermark). A single IT administrator operates everything, so
integrations must never silently fail, never become an upgrade hazard, and never
require standing infrastructure to babysit. They must also respect the
data-scope boundary: operational metadata only — no CUI/ITAR, banking, or PII.

## Decision

Every integration follows the same four-part contract:

1. **Env-gated, disabled by default.** A `lib/.../client.ts` reads config from
   environment variables and exposes `isXConfigured()`. With no env, the
   integration is off and the rest of the app is unaffected.
2. **Health probe.** Its configured/connected state appears in `GET /health`
   under `integrations`, so liveness is observable without logging in.
3. **Admin status page.** A page under the platform shows configured/connected
   state, last activity, and any error — green/red at a glance.
4. **Audited + coded.** Every call is audit-logged (and/or recorded in
   `NotificationLog`); failures surface as catalog error codes
   (`INTEG-50x`, `CRM-50x`, `DOC-50x` — see `docs/error-codes.md`).

Additional rules: least-privilege credentials (read-only where possible, e.g.
ProShop's allowlist); secrets only in environment managers, never in code;
external systems remain the system of record (we mirror or push, never assume
ownership); no point-to-point DB links or shared-file drops.

## Consequences

- A new integration is a known shape, not a research project — Twenty CRM and
  Papermark reuse the ProShop/ERPNext pattern verbatim.
- Integrations are safe to ship dark (off until env is set) and safe to leave
  off in environments that don't need them.
- Upgrades stay clean: integration code lives in `src/lib/integrations/*` and
  the layer, never in patched core.
- Slight duplication across bridge clients is accepted in exchange for each
  being independently understandable and removable.
