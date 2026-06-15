# Troubleshooting

First three checks for any production issue:

1. `GET /version` — what commit is actually deployed? (version, commit, build date)
2. `GET /health` — is the DB reachable, env complete, and which integrations are configured?
3. Recent commits + the audit log — what changed, and who did what?

Then walk the sequence: **What changed? → Can I reproduce it? → Smallest failing
case? → What do the logs say? → What does the error code mean
(`docs/error-codes.md`)? → Which system boundary failed? → Can I prove the fix?
→ Can I prevent recurrence (add a test)?**

## Common issues

| Symptom | Likely cause | Where to look |
|---|---|---|
| `/health` `ready:false` | DB unreachable or required env missing | `env.missing` in the `/health` body; Railway Postgres status |
| Integration page shows "not configured" | Env vars unset (disabled by default) | `/health` `integrations`; the bridge's env vars |
| `CRM-503` / `DOC-503` / `INTEG-503` | Twenty/Papermark env vars not set | the integration admin page; `docs/error-codes.md` |
| `CRM-502` / `DOC-502` | External service rejected request or unreachable | the bridge's NotificationLog/audit entries; the external service status |
| `SHIP-409` on confirm | Shipment already confirmed (idempotent — expected) | the shipment notification's confirmed_at |
| 403 on a page | RBAC: the role lacks the permission | `src/lib/permissions.ts`; the user's role |
| Migration not applied after deploy | `prisma migrate deploy` step | Railway deploy logs; `prisma/migrations/` ordering |

## Incident / bug report template

```md
## Summary           — what happened?
## Impact            — who/what is affected?
## Timeline          — when did it start? what changed recently?
## Environment       — prod/staging/local · version · commit (/version) · host
## Error             — error code · log excerpt · request id
## Reproduction      — 1. 2. 3.
## Expected / Actual
## Root cause
## Fix
## Verification      — proof (test, log, screenshot)
## Prevention        — the regression test added
## Follow-up tasks
```

Blameless, not consequence-free: fix the system so the same failure cannot recur
silently — usually by turning the bug into a test.
