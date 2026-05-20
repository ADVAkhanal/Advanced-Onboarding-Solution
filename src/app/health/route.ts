import { NextResponse } from "next/server";
import { PRODUCT_NAME } from "@/lib/reference-data";
import { prisma } from "@/lib/prisma";
import { pushoverStatus } from "@/lib/pushover";

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

  const pushover = pushoverStatus();
  return NextResponse.json({
    status: databaseConnected ? "ok" : "degraded",
    appName: PRODUCT_NAME,
    databaseConnected,
    timestamp: new Date().toISOString(),
    pushoverEnabled: pushover.enabled,
    recipientCount: pushover.recipientCount,
    version: process.env.npm_package_version ?? "1.0.0"
  });
}
