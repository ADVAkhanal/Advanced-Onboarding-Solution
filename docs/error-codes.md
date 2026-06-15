# Error Codes & Logging Conventions

Predictable errors and useful logs are how the system tells you *where, why,
and how badly* when it breaks.

## Format

`MODULE-CODE: Human readable message` — the machine code is stable and
greppable; the message is safe to show users and to log.

Source of truth: `src/lib/error-codes.ts` (unit-tested in `tests/run-tests.ts`).
Build an error with `appError("CRM-502", "optional non-sensitive detail")`;
`handleRouteError` serializes it to:

```json
{ "ok": false, "error": { "code": "CRM-502", "message": "Twenty CRM rejected the request or was unreachable." } }
```

## Catalog

| Code | HTTP | Meaning |
|---|---|---|
| `AUTH-401` | 401 | Authentication required. |
| `AUTH-403` | 403 | Permission denied. |
| `REQ-404` | 404 | Resource not found. |
| `REQ-422` | 422 | Missing/invalid fields. |
| `INTEG-503` | 503 | Integration not configured. |
| `INTEG-502` | 502 | Integration errored / unreachable. |
| `CRM-503` | 503 | Twenty CRM not configured. |
| `CRM-502` | 502 | Twenty CRM error / unreachable. |
| `DOC-503` | 503 | Papermark not configured. |
| `DOC-502` | 502 | Papermark error / unreachable. |
| `SHIP-404` | 404 | Shipment notification not found / link expired. |
| `SHIP-409` | 409 | Shipment already confirmed (idempotent). |
| `SHIP-422` | 422 | Shipment notification data incomplete. |
| `SRV-500` | 500 | Unexpected server error. |

Zod validation errors are returned as `validation_error` (422) by
`handleRouteError`; legacy routes use lowercase string codes (`not_found`,
`forbidden`) — both remain valid. New code should prefer the catalog.

## Logging

Structured JSON via pino (`src/lib/logger.ts`), with secret redaction
(passwords, tokens, cookies, authorization headers are censored).

Levels: `debug` (developer detail) · `info` (normal) · `warn` (suspicious) ·
`error` (failed) · `fatal` (cannot continue).

A good error log line carries: timestamp, level, error code, request/correlation
id where available, module, and cause. Example:

```json
{ "level": "error", "error_code": "CRM-502", "service": "api", "message": "Twenty CRM create person failed" }
```

**Never logged:** passwords, password hashes, API keys, session tokens, private
keys, cookies, or any CUI/customer-identifying technical data. The platform's
data-scope boundary keeps that data out of the system entirely.
