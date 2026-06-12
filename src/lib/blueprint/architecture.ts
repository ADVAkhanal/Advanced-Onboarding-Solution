/**
 * Platform architecture — environments and the six architecture domains,
 * sized for a single IT administrator. Everything here is boring on purpose:
 * managed services over self-run ones, pinned versions over latest, scripted
 * drills over heroics.
 */

export type Environment = {
  name: string;
  purpose: string;
  topology: string;
  refresh: string;
};

export const ENVIRONMENTS: Environment[] = [
  {
    name: "Development",
    purpose: "Where configuration and customization are authored — new doctypes, print formats, scripts, layer features.",
    topology: "Docker compose on the admin workstation or one small VM (erpnext-integration/ stack) + `npm run dev` for the layer. Throwaway data.",
    refresh: "Rebuilt at will from the pinned images + a sanitized staging snapshot when realistic data helps."
  },
  {
    name: "Testing",
    purpose: "Automated gate. Every change passes typecheck/lint/unit tests (layer) and bench tests (custom app) before promotion.",
    topology: "CI runners (GitHub Actions) — no standing servers. The layer already gates typecheck + lint + tests + build on every push.",
    refresh: "Ephemeral per run."
  },
  {
    name: "Staging",
    purpose: "Production rehearsal: ERPNext version bumps, migration dry-runs, and the quarterly backup-restore drill land here first.",
    topology: "Scaled-down copy of production (one host / small Railway env), same pinned versions, restored from last night's production backup.",
    refresh: "Weekly automated restore from production backup — which doubles as continuous backup validation."
  },
  {
    name: "Production",
    purpose: "The live Manufacturing Operating System.",
    topology: "ERPNext stack (pinned fork + advanced_pmc) on its host with MariaDB + Redis; Shop-Management layer on Railway with managed Postgres; TLS everywhere; bridge over HTTPS token auth.",
    refresh: "Changes arrive only via the promotion path: dev → CI → staging → prod. Nothing is edited live."
  }
];

export type ArchitectureDomain = {
  key: string;
  title: string;
  decisions: string[];
  singleAdminNote: string;
};

export const ARCHITECTURE_DOMAINS: ArchitectureDomain[] = [
  {
    key: "infrastructure",
    title: "Infrastructure",
    decisions: [
      "Two deployable units, cleanly separated: ERPNext (pinned fork + advanced_pmc custom app; Linux host, Docker compose from erpnext-integration/) and the Shop-Management layer (Next.js on Railway).",
      "Core is never patched — upgrades are version bumps of the pinned image, rehearsed on staging.",
      "Shop floor consumes the layer through cheap touch tablets/thin clients in kiosk mode; scanners are keyboard-wedge (no driver stack to maintain).",
      "Everything reproducible from the repo: compose files, env templates, and runbooks live in version control."
    ],
    singleAdminNote: "One person can rebuild either unit from the repo in under an hour — that, not uptime heroics, is the resilience strategy."
  },
  {
    key: "database",
    title: "Database",
    decisions: [
      "ERPNext on MariaDB (its native, best-tested engine); the layer on managed PostgreSQL (Railway) — no volume-backed file DBs anywhere.",
      "Each system owns its schema; cross-system reads go through the API bridge, never cross-database SQL.",
      "Append-only postures for records that are evidence (PM completions, job actuals, audit logs) — corrections supersede, never overwrite.",
      "Frappe Insights (read-only DB user) for ad-hoc analytics instead of giving humans SQL on production."
    ],
    singleAdminNote: "Managed Postgres + containerized MariaDB means zero hand-tuned database servers to babysit."
  },
  {
    key: "backup",
    title: "Backup & Recovery",
    decisions: [
      "Nightly encrypted off-host backups for both systems: bench backup (DB + files) shipped to object storage; Railway Postgres snapshots + logical dumps.",
      "35-day rolling retention; monthly archives retained 7 years for quality-record alignment (AS9100 posture).",
      "The weekly staging refresh IS the restore test — a backup that hasn't restored somewhere recently is treated as nonexistent.",
      "Documented RTO 4h / RPO 24h; the runbook is in the repo, not in anyone's head."
    ],
    singleAdminNote: "Restore drills are scheduled automation, not willpower — the admin reviews a green/red drill report."
  },
  {
    key: "monitoring",
    title: "Monitoring & Observability",
    decisions: [
      "Health endpoints on both systems (the layer's /health already reports DB, env, and integration status including the ERPNext bridge).",
      "Uptime monitoring (external pinger) on /health for both units with phone-level alerting (Pushover already wired).",
      "Error budgets kept simple: alert on down, on backup-failure, on sync-failure, and on SLA breach — silence otherwise (exception-only philosophy).",
      "Logs: structured app logs (pino in the layer; frappe logs) retained 30 days; no log platform until scale demands one."
    ],
    singleAdminNote: "Four alerts that matter beat forty graphs nobody reads."
  },
  {
    key: "security",
    title: "Security",
    decisions: [
      "Identity: MFA on all admin accounts; least-privilege integration user for the bridge; four-tier RBAC in the layer mapped onto ERPNext roles.",
      "The data-scope boundary is code, not policy: the bridge's operational-doctype allowlist rejects accounting/payroll/banking/PII doctypes outright.",
      "CUI/ITAR technical data never enters either system — drawings live in the compliant enclave and are referenced by number (NIST 800-171 / CMMC posture by architecture).",
      "TLS end-to-end, secrets only in environment managers (never code), dependency audit in CI, session secrets ≥ 32 chars, audit logging on every write path."
    ],
    singleAdminNote: "The strongest control is the one that needs no vigilance: data that never enters the system cannot leak from it."
  },
  {
    key: "integration",
    title: "Integration",
    decisions: [
      "API-first: every integration goes through documented HTTP APIs with token auth — the ERPNext bridge (read-only, allowlisted) and the layer's own audited routes.",
      "Existing integrations as the pattern: ProShop read-only mirror with observable sync runs; ERPNext bridge with liveness probe and admin page.",
      "New integrations must ship with: env-gated config (disabled by default), a health probe, an admin status page, and audit logging — the four-part contract already used twice.",
      "No point-to-point database links, no shared-file drops, no undocumented cron jobs."
    ],
    singleAdminNote: "Every integration is visible on an admin page with a green/red state — nothing integrates invisibly."
  }
];
