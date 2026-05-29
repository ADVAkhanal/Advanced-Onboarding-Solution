# Railway Deployment

How to run the Advanced Shop Management platform on Railway.

> Working tree: `C:/Users/Akhanal/Documents/Shop Management/` (package `cleanops-command-center`).

---

## TL;DR

- **Postgres: required.** Add a Railway PostgreSQL service; reference its URL as `DATABASE_URL`.
- **Volume: not required.** Nothing writes to local disk; the customer PDF is browser-printed, not server-generated. (Add object storage, not a volume, if you later persist uploads.)
- Migrations auto-apply on deploy (already wired in `railway.json`).

---

## 1. Services

| Service | Purpose |
|---|---|
| **App** (this repo) | Next.js server, built with Nixpacks. |
| **PostgreSQL** | Managed database. Add via Railway → New → Database → PostgreSQL. |

No Redis, no volume, no separate worker process is needed for the current feature set.

---

## 2. Environment variables (App service)

Reference the database from the Postgres service:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Set these manually:

| Var | Notes |
|---|---|
| `SESSION_SECRET` | 32+ random chars. |
| `BOOTSTRAP_ADMIN_EMAIL` | First admin login, created on boot. |
| `BOOTSTRAP_ADMIN_PASSWORD` | Strong temporary password; rotate after first login. |
| `APP_NAME` | e.g. `Advanced Shop Command Center`. |
| `COMPANY_NAME` | e.g. `Advanced PMC`. |
| `PUBLIC_BASE_URL` | Your Railway public URL (used in links). |

Optional:

| Var | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | Blank disables the SOP AI assistant gracefully. |
| `ANTHROPIC_MODEL` | Defaults to `claude-sonnet-4-6`. |
| `PUSHOVER_APP_TOKEN`, `PUSHOVER_USER_KEYS` | Optional notifications. |

`PORT` is injected by Railway automatically — `npm start` already reads it.

---

## 3. Build & deploy (already configured in `railway.json`)

```json
build.buildCommand:   "npm run build"          // prisma generate && next build
deploy.startCommand:  "npm run prisma:deploy && npm run start"   // migrate deploy, then start
deploy.healthcheckPath: "/health"
```

So on every deploy: build → apply pending migrations → start. The
`/health` endpoint reports DB connectivity for the healthcheck.

---

## 4. First boot

1. Deploy. Migrations create the full schema including the quoting engine
   (`20260528160000_quoting_engine_manufacturing`) and the feedback loop
   (`20260529100000_job_actuals_feedback_loop`).
2. Log in with the bootstrap admin credentials.
3. (Optional) Seed the 17 demo cycle-time buckets so the quote intake form
   shows lookup matches immediately:
   ```
   railway run bash -lc "ALLOW_DEMO_SEED=true npm run seed:demo"
   ```
   Skip this in a real tenant — log real job actuals instead so estimates
   become `DERIVED` from your own history (see `docs/quoting-engine.md`).

---

## 5. Smoke test after deploy

- `GET /health` → 200, `databaseConnected: true`.
- Log in → `/erp/quotes` shows KPI tiles.
- `/erp/quotes/new` → create a quote → `/erp/quotes/[id]` → `Customer PDF`
  → browser print preview is clean (no app chrome).
- `/erp/quotes/cycle-times` → log a job actual → the matching lookup flips
  to **Derived** with a confidence score.

---

## Notes on architecture vs. platform-engineering patterns

Railway is a PaaS: it owns the load balancer, DNS, edge, TLS, and
autoscaling. Self-service infra provisioning, service-broker async
provisioning queues, and proxy control planes (the kind of platform
engineering appropriate at AWS scale) are **not** applicable here and
would re-solve what Railway already provides. The discipline that *does*
carry over — small, understandable, well-documented, tested changes so
the system stays maintainable over years — is applied per-slice in the
commit history and the `docs/` module docs.
