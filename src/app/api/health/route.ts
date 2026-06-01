import { NextResponse } from "next/server";
import { checkEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { isProShopConfigured } from "@/lib/proshop/client";
import { pushoverStatus } from "@/lib/pushover";
import { PRODUCT_NAME } from "@/lib/reference-data";

export const dynamic = "force-dynamic";

export async function GET() {
  let databaseConnected = false;
  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {
      databaseConnected = false;
    }
  }

  const env = checkEnv();
  const pushover = pushoverStatus();
  // Readiness = can serve real traffic: DB reachable and required env present.
  const ready = databaseConnected && env.ok;

  return NextResponse.json({
    status: ready ? "ok" : "degraded",
    ready,
    appName: PRODUCT_NAME,
    databaseConnected,
    env: { ok: env.ok, missing: env.missing },
    integrations: {
      proshopConfigured: isProShopConfigured(),
      cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
      pushoverEnabled: pushover.enabled
    },
    timestamp: new Date().toISOString(),
    pushoverEnabled: pushover.enabled,
    recipientCount: pushover.recipientCount,
    version: process.env.npm_package_version ?? "1.0.0"
  });
}
