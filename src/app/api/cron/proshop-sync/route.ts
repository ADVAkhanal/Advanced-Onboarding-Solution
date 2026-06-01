import { recordAudit } from "@/lib/audit";
import { fail, handleRouteError, ok } from "@/lib/http";
import { resolveSyncOrganizationId, syncActiveWorkOrders } from "@/lib/proshop/sync";

export const dynamic = "force-dynamic";

/**
 * Scheduled, read-only ProShop sync. Designed to be called by a Railway
 * cron service (or any external scheduler), not a logged-in user.
 *
 * Guarded by CRON_SECRET: the caller must send `x-cron-secret` matching the
 * env value. With CRON_SECRET unset, scheduled sync is disabled (503) so it
 * can never run unauthenticated.
 *
 * Configure in Railway:
 *   POST https://<app>/api/cron/proshop-sync   header x-cron-secret: <CRON_SECRET>
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return fail(503, "Scheduled sync is disabled (CRON_SECRET not set).", "cron_disabled");
  }
  const provided = request.headers.get("x-cron-secret")?.trim();
  if (!provided || provided !== secret) {
    return fail(401, "Invalid or missing cron secret.", "unauthorized");
  }

  const organizationId = await resolveSyncOrganizationId();
  if (!organizationId) {
    return fail(409, "No organization to sync.", "no_org");
  }

  const summary = await syncActiveWorkOrders(organizationId, "cron");

  await recordAudit({
    organizationId,
    action: "proshop.sync.cron",
    entityType: "proshop_sync_run",
    entityId: summary.runId,
    outcome: summary.status === "success" ? "SUCCESS" : "FAILED",
    reason: summary.error ?? undefined,
    after: summary
  });

  return ok({ summary }, { status: summary.status === "success" ? 200 : 502 });
}

export async function POST(request: Request) {
  try {
    return await handle(request);
  } catch (error) {
    return handleRouteError(error);
  }
}

// Some schedulers only issue GET; accept both, same guard.
export async function GET(request: Request) {
  try {
    return await handle(request);
  } catch (error) {
    return handleRouteError(error);
  }
}
