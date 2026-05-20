import { requirePermission } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requirePermission("admin:manage");
    await prisma.$queryRaw`SELECT 1`;
    return ok({
      database: "ready",
      checkedBy: user.email,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
