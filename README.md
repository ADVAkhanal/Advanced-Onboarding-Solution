# Advanced Shop Management & Onboarding Command Center

Production-ready internal management platform for ADVANCED / Advanced Consulting Inc. It centralizes onboarding, employee lifecycle tracking, department tickets, payroll coordination, time-off requests, attendance notes, approvals, recurring checklists, manager follow-ups, and executive reporting.

This is intentionally not a CMMC, PCI, cybersecurity evidence, formal audit packet, or payroll-processing system. Payroll workflows coordinate safe review, approvals, and exports only. The application must not store bank account numbers, full SSNs, tax filing credentials, protected health information, payment card data, production passwords, API keys, or payroll processor credentials.

## Stack

- Next.js App Router
- PostgreSQL source of truth
- Prisma ORM and migrations
- Zod server-side validation
- HttpOnly signed session cookies
- Server-side RBAC
- Structured server logging
- GitHub Actions CI
- Railway deployment support

## Quick Start

1. Install Node.js 20+ and npm.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to a PostgreSQL database.
4. Set a strong `SESSION_SECRET`.
5. Run:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed:reference
npm run dev
```

The app runs at `http://localhost:3000`.

## Reference Seed

`npm run seed:reference` creates the organization shell, four role levels, permissions, departments, locations, shifts, job titles, ticket centers, ticket categories, workflow templates, report templates, and safe configuration records.

It does not create demo employees or fake production tickets. To create a first admin user, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before running the reference seed.

`npm run seed:demo` is separated on purpose and should not be used in production.

## Deployment: GitHub -> Railway -> Railway PostgreSQL

1. Push this repository to GitHub.
2. Create a Railway project from the repository.
3. Add a Railway PostgreSQL database.
4. Set environment variables:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `APP_URL`
   - optional `SENTRY_DSN`
5. Railway uses `railway.json` to build, deploy migrations, start Next.js, and check `/api/health`.

## Required Scripts

The following scripts are provided: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:unit`, `test:integration`, `prisma:generate`, `prisma:migrate`, `prisma:deploy`, `prisma:seed`, `seed:reference`, `seed:demo`, `audit:deps`, and `format`.

## Key Safety Rules

- All protected API routes require a signed session and server-side permission checks.
- Sensitive actions are written to `audit_log`.
- Payroll views and exports require payroll permissions.
- Manager notes and lifecycle records enforce role and visibility checks.
- Uploads are limited by file type and file size.
- Export fields are safe coordination fields only.
- Database readiness is exposed through a protected endpoint at `/api/admin/readiness`.

## Product Disclaimer

This platform supports internal management, onboarding, payroll coordination, department ticketing, productivity tracking, and employee lifecycle documentation. It does not process payments, store banking credentials, replace payroll tax systems, or directly modify HR, payroll, accounting, IT, or production systems unless an approved integration is explicitly configured.
