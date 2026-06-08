import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, ok } from "@/lib/http";
import { seedMaintenanceBaseline } from "@/lib/maintenance-seed";

export const dynamic = "force-dynamic";

/**
 * Load the Advanced PMC maintenance baseline (machine roster, MRO supplies, PM
 * cadence) into this organization. Idempotent — a no-op once any machine
 * exists. Manage permission only.
 */
export async function POST() {
  try {
    const user = await requirePermission("maintenance:manage");
    const result = await seedMaintenanceBaseline(user.organizationId, user.id);
    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "maintenance.seed_baseline",
      entityType: "maintenance",
      after: result
    });
    return ok({ result });
  } catch (error) {
    return handleRouteError(error);
  }
}
