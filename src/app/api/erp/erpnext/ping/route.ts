import { requirePermission } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { erpnextPing, isErpNextConfigured } from "@/lib/erpnext/client";

export const dynamic = "force-dynamic";

/** Read-only ERPNext liveness probe for the integration admin page. */
export async function GET() {
  try {
    await requirePermission("admin:manage");
    if (!isErpNextConfigured()) {
      return ok({ configured: false, user: null, error: null });
    }
    const result = await erpnextPing();
    return ok({ configured: true, user: result.data, error: result.error });
  } catch (error) {
    return handleRouteError(error);
  }
}
