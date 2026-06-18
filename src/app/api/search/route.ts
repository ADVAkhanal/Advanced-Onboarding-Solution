import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { globalSearch } from "@/lib/search/global-search";

export const dynamic = "force-dynamic";

// Permission-aware global search. Authenticated but needs no specific
// permission — globalSearch only queries modules the caller can view.
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const result = await globalSearch(user, q);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
