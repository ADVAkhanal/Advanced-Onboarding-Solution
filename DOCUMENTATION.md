# CleanOps Command Center Documentation

## Executive Summary

CleanOps Command Center is a focused internal operations platform for small shops, manufacturers, service companies, and department-heavy teams. It centralizes daily operational work that is commonly scattered across texts, spreadsheets, sticky notes, emails, verbal follow-ups, and manager memory.

The MVP provides secure browser-based workflows for department tickets, onboarding cases, payroll coordination, time-off requests, attendance and schedule issues, tasks, recurring checklists, approvals, reports, audit logs, data boundaries, and practical admin configuration.

Production readiness status: the app builds successfully, has a Railway-compatible deployment path, uses PostgreSQL through Prisma, enforces server-side role checks, supports bootstrap admin creation, logs sensitive actions, and exposes `/health`. The product is suitable for a controlled MVP launch after environment configuration, database backup setup, admin password rotation, and operational user training.

## System Architecture

| Boundary | Responsibility |
| --- | --- |
| Next.js App Router | Server-rendered pages, protected layouts, API route handlers |
| Prisma | PostgreSQL data access, schema, migrations, seed data |
| Auth module | bcrypt hashing, signed httpOnly cookie sessions, current-user loading |
| RBAC module | Permission mapping for `USER`, `MANAGER`, `DIRECTOR`, `ADMIN` |
| Department scope | Manager department restriction and director department-access grants |
| Audit module | Database audit records for sensitive operations |
| Notification module | Optional Pushover alerts with non-blocking failure handling |
| Reporting module | Report records, CSV export, export history, audit log entries |

Runtime flow:

1. User requests a protected route.
2. Platform layout calls `getCurrentUser`.
3. Session cookie is verified using `SESSION_SECRET`.
4. User status, permissions, and department access are loaded from PostgreSQL.
5. Pages and APIs enforce server-side permissions before querying or mutating records.
6. Sensitive mutations write `AuditLog` rows.
7. Optional alerts write `NotificationLog` rows.

Design philosophy: keep the MVP operationally useful, security-conscious, and maintainable without creating fake enterprise complexity or compliance claims.

## Technical Stack

| Area | Implementation |
| --- | --- |
| Language | TypeScript |
| Framework | Next.js App Router |
| UI | React, Tailwind CSS, custom command-center CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Password hashing | bcryptjs |
| Sessions | signed httpOnly cookies |
| Logging | pino and database audit logs |
| Tests | `tsx` test runner for permission and health checks |
| Deployment | GitHub -> Railway -> Railway PostgreSQL |

## Installation & Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `SESSION_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `APP_NAME`, and `COMPANY_NAME`.
3. Run `npm install`.
4. Run `npm run prisma:generate`.
5. Run `npm run prisma:migrate`.
6. Run `npm run prisma:seed`.
7. Start local dev with `npm run dev`.

Production deployment uses `npm run build`, `npm run prisma:deploy`, and `npm run start`. The app binds to `process.env.PORT` through the Railway start command.

## Configuration

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Must be strong and at least 32 characters |
| `BOOTSTRAP_ADMIN_EMAIL` | Yes | Creates first admin when no users exist |
| `BOOTSTRAP_ADMIN_PASSWORD` | Yes | Hashed before storage |
| `APP_NAME` | Yes | Defaults to CleanOps Command Center |
| `COMPANY_NAME` | Yes | Customer/company display name |
| `PUBLIC_BASE_URL` | Optional | Used by future notifications or signed links |
| `PUSHOVER_APP_TOKEN` | Optional | Enables alerts when paired with user keys |
| `PUSHOVER_USER_KEYS` | Optional | Comma-separated recipients |

Secrets are read from environment variables and must not be stored in the database or committed to source control.

## Feature Documentation

### Authentication and Bootstrap

Purpose: protect all non-public routes and create the first admin safely.

Inputs: email and password.

Workflow: if no users exist, `/login` and `/api/auth/login` attempt bootstrap admin creation from environment variables. Passwords are hashed with bcrypt. Successful login sets a signed httpOnly cookie.

Failure scenarios: missing bootstrap env vars prevents first-user creation; invalid credentials return a safe error; failed login writes an audit event when an organization exists.

### Role and Department Authorization

Roles: exactly `USER`, `MANAGER`, `DIRECTOR`, `ADMIN`.

Managers are scoped to their assigned department. Directors are scoped through `UserDepartmentAccess` unless granted `ALL`. Admins can view and manage all records.

Operational consideration: frontend hiding is only convenience; API routes and server pages enforce authorization before data access.

### Department Tickets

Purpose: replace unmanaged requests with owned, statused, auditable department tickets.

Inputs: department, ticket center, title, description, priority, assigned owner, due date, related records.

Outputs: ticket row, status history, audit events, optional Pushover alert for urgent/work-stoppage tickets.

Failure scenarios: department-scope denial, validation errors, missing ticket center, unauthorized status updates.

### Onboarding Cases

Purpose: coordinate safe onboarding readiness without storing SSNs, banking data, medical records, or background-check results.

Inputs: employee name, contact fields, department, role, manager, start date, setup statuses, notes.

Outputs: onboarding case, status history, audit event, readiness views.

Operational consideration: onboarding is coordination-focused and should link to payroll, equipment, training, and approvals only through safe fields.

### Payroll Coordination

Purpose: track payroll-related requests without processing payroll, calculating taxes, or storing banking/tax credentials.

Inputs: request type, department, employee profile reference, effective date, safe summary, proposed summary, business reason.

Outputs: payroll request, status history, audit event, optional Pushover alert.

Failure scenarios: unauthorized department, prohibited data entered by a user, missing business reason, attempted self-approval in approval flow.

### Time-Off Requests

Purpose: coordinate time-off approvals, coverage planning, and payroll handoff flags.

Inputs: employee profile reference, type, dates, hours/days, coverage plan, payroll note flag.

Outputs: request queue, manager visibility, report-ready records.

### Attendance and Schedule Issues

Purpose: capture missed punches, late arrivals, absences, shift swaps, overtime notes, and payroll-impact coordination.

Inputs: issue type, date, shift, description, correction needed flag, payroll impact flag.

Outputs: issue record, manager review queue, audit trail.

### Tasks and Checklists

Purpose: make manager follow-through trackable.

Inputs: title, department, owner, due date, priority, linked operational records.

Outputs: productivity task records, recurring checklist visibility, missed completion indicators.

### Approvals

Purpose: centralize decisions and prevent undocumented approvals.

Inputs: approval type, source record, requester, approver/owner, priority, summary, due date.

Outputs: approval queue, decisions, audit log, optional Pushover alert.

Rules: self-approval is blocked for approval decisions.

### Reports and Exports

Purpose: provide clean internal reporting without compliance-audit claims.

Reports include open tickets, overdue tickets, onboarding readiness, payroll coordination, time-off, manager workload, and audit activity.

CSV export is implemented at `/api/reports/csv` and logs both `ReportExport` and `AuditLog`.

## API Documentation

| Endpoint | Methods | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/auth/login` | POST | Public | Login and bootstrap admin check |
| `/api/auth/logout` | POST | Session | Clear session and audit logout |
| `/api/auth/me` | GET | Session | Current user details |
| `/api/tickets` | GET, POST | `ticket:view/create` | Ticket list and creation |
| `/api/tickets/[id]` | GET, PATCH | `ticket:view/manage` | Ticket detail and update |
| `/api/tickets/[id]/comments` | POST | `ticket:view` | Comment on permitted ticket |
| `/api/onboarding-cases` | GET, POST | `onboarding:view/create` | Onboarding records |
| `/api/payroll/change-requests` | GET, POST | `payroll:view/create` | Payroll coordination records |
| `/api/time-off` | GET, POST | `timeoff:view/create` | Time-off records |
| `/api/attendance/issues` | GET, POST | `attendance:view/create` | Attendance and schedule records |
| `/api/tasks` | GET, POST | `task:view/create` | Productivity task records |
| `/api/approvals` | GET, POST | `approval:view` | Approval queue |
| `/api/approvals/[id]/decisions` | POST | `approval:decide` | Approval decision |
| `/api/reports` | GET, POST | `report:view/export` | Report generation |
| `/api/reports/csv` | GET | `report:export` | Open-ticket CSV export |
| `/api/files` | POST | `file:upload` | Metadata-only upload record |
| `/api/admin/readiness` | GET | `admin:manage` | Protected DB readiness |
| `/health` | GET | Public | Railway health check |

Validation errors return safe structured JSON. Production route errors do not expose stack traces.

## Security & Audit Readiness

Implemented controls:

- bcrypt password hashing
- signed httpOnly cookies
- server-side permission checks
- manager and director department scoping
- Zod validation on API input
- audit logging for auth, tickets, payroll requests, approvals, exports, uploads, and admin operations
- no browser localStorage tokens
- no prohibited banking, SSN, medical, CUI, card, or secret fields in the operational MVP
- metadata-only upload handling
- security headers in `next.config.mjs`

Risk areas requiring operational control:

- Password reset and user invite flows are not yet self-service.
- Director department grants need admin process discipline.
- Pushover is optional and should only be enabled with approved recipients.
- Local file body storage is intentionally disabled for MVP; future storage must be private and audited.

## Reliability & Operations

Monitoring recommendations:

- Use Railway service health checks against `/health`.
- Enable Railway PostgreSQL backups.
- Add Sentry or equivalent before broad rollout.
- Review `AuditLog` and `NotificationLog` during early adoption.

Recovery assumptions:

- PostgreSQL is the source of truth.
- Railway PostgreSQL backup and restore is the primary recovery path.
- App instances are stateless apart from signed session cookies.

Troubleshooting:

- `/health` degraded usually means `DATABASE_URL` is missing or the database is unreachable.
- Login unavailable on first deploy usually means bootstrap env vars are missing.
- Missing departments/ticket centers usually means `npm run prisma:seed` was not run.
- Pushover failures do not block core workflows; check `notification_logs`.

## Codebase Intelligence

| Path | Purpose |
| --- | --- |
| `src/app` | App Router pages and API routes |
| `src/app/(platform)` | Authenticated product routes |
| `src/lib/auth.ts` | Sessions, current user, RBAC helpers |
| `src/lib/permissions.ts` | Permission matrix |
| `src/lib/bootstrap.ts` | First admin creation |
| `src/lib/audit.ts` | Audit log writer |
| `src/lib/pushover.ts` | Optional notification integration |
| `src/lib/validators.ts` | Zod input schemas |
| `prisma/schema.prisma` | Database schema |
| `prisma/seed.ts` | Safe reference seed |
| `.github/workflows/ci.yml` | CI verification |

Important extension points:

- Add admin CRUD server actions for user and department management.
- Add richer report templates behind existing report/export records.
- Add private object storage if real upload bodies are required.
- Add password reset and invite flows.

## Developer Experience

Common commands:

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run prisma:generate
npm run prisma:migrate
npm run build
```

Development rules:

- Keep operational records in PostgreSQL, never browser storage.
- Add Zod validation before accepting new API input.
- Call `recordAudit` for sensitive mutations.
- Apply `canAccessDepartment` or `departmentScopeForUser` to scoped records.
- Do not add compliance, CUI, PCI, or cybersecurity evidence modules.

## Known Risks & Limitations

| Area | Limitation |
| --- | --- |
| User management | Admin pages are operational views; full CRUD and password reset should be expanded |
| Uploads | Metadata-only MVP; no durable private file storage |
| Reporting | CSV export exists; PDF/DOCX/XLSX need future implementation |
| Notifications | Pushover only; no email/SMS queue yet |
| Session storage | Signed cookie sessions; DB session model exists for future server-side revocation |
| Director grants | Schema and auth support grants; admin grant workflow should be expanded |
| Auditing | App-level audit log exists; database-level immutable audit controls are future hardening |

## Future Roadmap

1. Admin CRUD for users, departments, department access, and roles.
2. Password reset, invite flow, forced password rotation, and optional MFA.
3. Private object storage with malware scanning and download authorization.
4. More report exporters with safe field templates.
5. Notification queue with retries and delivery dashboards.
6. Rate limiting backed by database or Redis-compatible storage.
7. Row-level database constraints and stronger relational foreign keys.
8. Production monitoring, Sentry integration, and restore drills.
