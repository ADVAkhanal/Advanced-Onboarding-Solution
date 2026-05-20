# CleanOps Command Center

CleanOps Command Center is a secure internal operations web app for small shops, manufacturers, service companies, and department-heavy teams that need one place to manage daily operational work.

It focuses on department tickets, onboarding cases, payroll coordination requests, time-off requests, attendance and schedule issues, recurring checklists, approvals, manager tasks, basic employee profile summaries, reports, audit logs, and practical admin configuration.

## What It Is

| Area | Capability |
| --- | --- |
| Operations control | Role-aware dashboard, urgent queues, department visibility, manager workload indicators |
| Department tickets | Department-scoped queues, priorities, status history, comments, reassignment, close/reopen workflow |
| Onboarding | New hire, contractor, temp, intern, rehire, transfer, and role-change coordination records |
| Payroll coordination | Safe request, approval, review, export, and handoff tracking without payroll processing |
| Time and attendance | Time-off, schedule issue, missed punch, overtime note, and payroll-impact coordination |
| Manager accountability | Tasks, recurring checklists, blockers, approval queues, reports, and audit history |
| Administration | Users, four role tiers, departments, department access, settings, data boundaries, audit log |

## What It Is Not

CleanOps is not an ERP, payroll processor, HRIS, accounting system, CUI enclave, PCI/payment platform, formal compliance evidence system, CMMC tool, SSP/POA&M system, or cybersecurity operations platform.

This platform supports internal operations, department tickets, onboarding, approvals, payroll coordination, checklists, and manager accountability. It is not designed to store CUI, payment-card data, bank information, full SSNs, medical records, tax credentials, payroll passwords, API keys, or cybersecurity secrets.

## Enclave-Compatible Statement

Customers with regulated environments may access this platform from within their own approved secure browser, VDI, or enclave environment, but the customer remains responsible for controlling what data is entered, uploaded, exported, or integrated. This platform is not a CUI enclave and must not be used to store or process CUI unless a future compliant deployment is explicitly designed, contracted, and assessed.

## Technical Stack

| Layer | Technology |
| --- | --- |
| Web app | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS plus scoped command-center CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Auth | bcrypt password hashing, signed httpOnly session cookies |
| Logging | pino plus database audit events |
| Deployment | GitHub to Railway with Railway PostgreSQL |
| Notifications | Optional Pushover manager/admin alerts |

## Local Setup

1. Install Node.js 20 or newer.
2. Install PostgreSQL locally or create a Railway PostgreSQL database.
3. Copy `.env.example` to `.env`.
4. Fill in `DATABASE_URL`, `SESSION_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD`.
5. Install dependencies:

```bash
npm install
```

6. Generate Prisma Client and apply migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

7. Load safe reference configuration:

```bash
npm run prisma:seed
```

8. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000/login` and sign in with the bootstrap admin credentials.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Strong secret for signing httpOnly session cookies |
| `BOOTSTRAP_ADMIN_EMAIL` | Yes | First admin email created when no users exist |
| `BOOTSTRAP_ADMIN_PASSWORD` | Yes | First admin password, hashed before storage |
| `APP_NAME` | Yes | Defaults to `CleanOps Command Center` |
| `COMPANY_NAME` | Yes | Customer/company display name |
| `PUBLIC_BASE_URL` | Optional | Public app URL for future signed links or notifications |
| `PUSHOVER_APP_TOKEN` | Optional | Enables Pushover alerts when set with recipients |
| `PUSHOVER_USER_KEYS` | Optional | Comma-separated Pushover user/group keys |

No other variables are required for the MVP.

## Bootstrap Admin

On first deploy, if no users exist, CleanOps creates an admin from:

```bash
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
```

The password is hashed with bcrypt before storage. After first sign-in, rotate the temporary password through your normal operational process.

## Pushover Alerts

If `PUSHOVER_APP_TOKEN` and `PUSHOVER_USER_KEYS` are set, CleanOps sends manager/admin alerts for:

- urgent ticket created
- work stoppage ticket created
- payroll coordination request submitted
- approval request created

If those variables are absent, the app runs normally and simply skips external alerts.

## Health Checks

Public health endpoint:

```text
/health
```

Returns:

```json
{
  "status": "ok",
  "appName": "CleanOps Command Center",
  "databaseConnected": true,
  "timestamp": "2026-05-20T00:00:00.000Z",
  "pushoverEnabled": false,
  "recipientCount": 0,
  "version": "1.0.0"
}
```

Protected database readiness endpoint:

```text
/api/admin/readiness
```

Requires `ADMIN` permission.

## Railway Deployment

1. Push the repository to GitHub.
2. Create a Railway project.
3. Add a Railway PostgreSQL database.
4. Add a web service from the GitHub repository.
5. Set the required environment variables in Railway.
6. Confirm `DATABASE_URL` points to the Railway PostgreSQL database.
7. Railway runs:

```bash
npm run build
npm run prisma:deploy
npm run start
```

8. Confirm `/health` returns `databaseConnected: true`.
9. Visit `/login` and sign in with the bootstrap admin.

## Custom Domain

Railway gives the app a temporary `railway.app` domain. To use a normal domain such as `app.yourcompany.com`:

1. Buy a domain from a registrar.
2. In Railway, open the web service.
3. Go to Settings -> Networking -> Custom Domain.
4. Add `app.yourdomain.com`.
5. Railway will show DNS records.
6. Add those DNS records at your domain provider.
7. Wait for verification.
8. Railway will provision HTTPS automatically.
9. Update `PUBLIC_BASE_URL=https://app.yourdomain.com` if using notifications or signed links.

Recommended structure:

- `yourdomain.com` = marketing website
- `app.yourdomain.com` = CleanOps app
- `docs.yourdomain.com` = documentation later
- `status.yourdomain.com` = status page later

## GitHub Setup

The repository includes GitHub Actions for:

- dependency install
- Prisma generate
- lint
- typecheck
- tests
- Next.js build

Use protected branches and require CI before merging to production.

## Security Model

| Control | Implementation |
| --- | --- |
| Authentication | bcrypt password hashes and httpOnly signed cookies |
| Authorization | server-side role checks and department scoping |
| Roles | exactly `USER`, `MANAGER`, `DIRECTOR`, `ADMIN` |
| Data boundaries | visible warnings and no prohibited payroll/banking/SSN/CUI fields |
| Audit | login, failed login, logout, ticket changes, payroll requests, approvals, exports, uploads, and admin actions |
| Files | MVP stores metadata only; no persistent file body storage |
| Exports | CSV report export logs `ReportExport` and `AuditLog` records |
| Secrets | no hardcoded production secrets, no tokens in browser storage |

## Production Hardening Checklist

- Rotate bootstrap password after first login.
- Use a high-entropy `SESSION_SECRET`.
- Enable Railway backups for PostgreSQL.
- Configure a custom domain and HTTPS.
- Add admin process for user creation, password reset, and deactivation.
- Review department access grants before inviting managers/directors.
- Confirm employees are trained on prohibited data entry.
- Enable Pushover only with approved recipients.
- Add Sentry or equivalent error monitoring before broad rollout.
- Review `npm audit` findings and patch dependencies on a recurring cadence.
- Validate backup restore in a non-production Railway environment.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
```
