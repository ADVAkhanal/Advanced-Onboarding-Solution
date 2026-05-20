import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
        status: "ACTIVE",
        archivedAt: null
      }
    });

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return fail(401, "Invalid email or password.", "invalid_credentials");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    setSessionCookie(user);
    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id
    });

    return ok({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userLevel: user.userLevel,
        departmentId: user.departmentId
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
