import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, ok } from "@/lib/http";
import { syncActiveWorkOrders } from "@/lib/proshop/sync";

export const dynamic = "force-dynamic";

/**
 * Manually trigger a read-only ProShop work-order sync. Admin-only.
 * The run (success or failure) is always recorded in proshop_sync_runs
 * for observability; this endpoint returns its summary.
 */
export async function POST() {
  try {
    const user = await requirePermission("admin:manage");

    const summary = await syncActiveWorkOrders(user.organizationId, "manual", user.id);

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "proshop.sync.manual",
      entityType: "proshop_sync_run",
      entityId: summary.runId,
      outcome: summary.status === "success" ? "SUCCESS" : "FAILED",
      reason: summary.error ?? undefined,
      after: summary
    });

    return ok({ summary }, { status: summary.status === "success" ? 200 : 502 });
  } catch (error) {
    return handleRouteError(error);
  }
}
