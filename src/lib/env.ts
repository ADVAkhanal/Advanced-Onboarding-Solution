import { logger } from "./logger";

/**
 * Lightweight environment validation. Runs once at server startup (via
 * src/instrumentation.ts) and is also callable from the health probe.
 *
 * Philosophy: log loudly, fail soft. Missing DATABASE_URL / SESSION_SECRET
 * will already break Prisma / auth with clear errors; we surface the problem
 * early in the logs rather than crashing the process into a Railway boot loop.
 */

const REQUIRED = ["DATABASE_URL", "SESSION_SECRET"] as const;

export type EnvReport = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

export function checkEnv(): EnvReport {
  const isProd = process.env.NODE_ENV === "production";
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  const warnings: string[] = [];

  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length < 32) {
    warnings.push("SESSION_SECRET should be at least 32 characters.");
  }
  if (isProd && process.env.BOOTSTRAP_ADMIN_PASSWORD && process.env.BOOTSTRAP_ADMIN_PASSWORD.length < 12) {
    warnings.push("BOOTSTRAP_ADMIN_PASSWORD is weak for production.");
  }
  // Object storage / volume guidance: exports stream to the client, so no
  // primary-DB volume is needed. Flag only if someone points DATABASE_URL at
  // a sqlite file (not supported here).
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("file:")) {
    warnings.push("DATABASE_URL points at a file: use managed Postgres in production, not a volume-backed file DB.");
  }
  // ERPNext bridge is optional, but a partial config is a silent footgun.
  const erpVars = ["ERPNEXT_BASE_URL", "ERPNEXT_API_KEY", "ERPNEXT_API_SECRET"];
  const erpSet = erpVars.filter((k) => process.env[k]?.trim());
  if (erpSet.length > 0 && erpSet.length < erpVars.length) {
    warnings.push(`ERPNext bridge is partially configured (set: ${erpSet.join(", ")}). Set all of ${erpVars.join(", ")} or none.`);
  }

  return { ok: missing.length === 0, missing, warnings };
}

let validated = false;

export function validateEnv(): EnvReport {
  const report = checkEnv();
  if (!validated) {
    validated = true;
    const isProd = process.env.NODE_ENV === "production";
    if (report.missing.length) {
      const message = `Missing required environment variables: ${report.missing.join(", ")}`;
      if (isProd) logger.error(message);
      else logger.warn(message);
    }
    for (const w of report.warnings) {
      if (isProd) logger.warn(w);
    }
    if (report.ok && !report.warnings.length) {
      logger.info("Environment validation passed.");
    }
  }
  return report;
}
