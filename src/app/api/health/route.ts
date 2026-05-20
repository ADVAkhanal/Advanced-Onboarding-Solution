import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({
    service: "advanced-shop-command-center",
    status: "ok",
    timestamp: new Date().toISOString()
  });
}
