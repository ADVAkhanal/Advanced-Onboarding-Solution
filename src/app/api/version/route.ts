import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /version — build provenance for troubleshooting (per the engineering
 * guideline). Public like /health; returns no secrets — only version, commit,
 * build date, runtime. Railway injects RAILWAY_GIT_COMMIT_SHA at build time.
 */
export async function GET() {
  return NextResponse.json({
    version: process.env.npm_package_version ?? "1.0.0",
    commit:
      process.env.RAILWAY_GIT_COMMIT_SHA ??
      process.env.GIT_COMMIT ??
      process.env.SOURCE_VERSION ??
      "unknown",
    buildDate: process.env.BUILD_DATE ?? null,
    node: process.version,
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString()
  });
}
