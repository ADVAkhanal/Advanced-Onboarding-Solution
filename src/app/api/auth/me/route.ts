import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}
