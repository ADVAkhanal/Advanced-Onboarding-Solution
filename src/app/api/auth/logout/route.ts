import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getCurrentUser();
    clearSessionCookie();

    if (user) {
      await recordAudit({
        organizationId: user.organizationId,
        actorId: user.id,
        action: "auth.logout",
        entityType: "user",
        entityId: user.id
      });
    }

    return ok({ loggedOut: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
