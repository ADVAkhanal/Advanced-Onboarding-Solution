import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { HttpError } from "./http";
import { permissionsForLevel, type PermissionKey } from "./permissions";
import { prisma } from "./prisma";
import { SESSION_COOKIE } from "./session-constants";

const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  userId: string;
  organizationId: string;
  userLevel: string;
  issuedAt: number;
  expiresAt: number;
};

export type AuthenticatedUser = Pick<
  User,
  "id" | "organizationId" | "email" | "firstName" | "lastName" | "title" | "userLevel" | "departmentId" | "managerId" | "directorId"
> & {
  permissions: PermissionKey[];
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be set to a strong value of at least 32 characters.");
  }
  return value;
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function parseToken(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = sign(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  if (payload.expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function createSessionToken(user: Pick<User, "id" | "organizationId" | "userLevel">) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId: user.id,
    organizationId: user.organizationId,
    userLevel: user.userLevel,
    issuedAt,
    expiresAt: issuedAt + SESSION_TTL_SECONDS
  };
  const body = base64Url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function setSessionCookie(user: Pick<User, "id" | "organizationId" | "userLevel">) {
  cookies().set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

async function loadPermissions(user: User): Promise<PermissionKey[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { organizationId: user.organizationId, userId: user.id, archivedAt: null }
  });

  if (userRoles.length === 0) {
    return permissionsForLevel(user.userLevel);
  }

  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      organizationId: user.organizationId,
      roleId: { in: userRoles.map((role) => role.roleId) },
      archivedAt: null
    }
  });

  if (rolePermissions.length === 0) {
    return permissionsForLevel(user.userLevel);
  }

  const permissions = await prisma.permission.findMany({
    where: {
      organizationId: user.organizationId,
      id: { in: rolePermissions.map((permission) => permission.permissionId) },
      archivedAt: null
    }
  });

  return [...new Set(permissions.map((permission) => permission.key as PermissionKey))];
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const session = parseToken(token);
  if (!session) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.userId,
      organizationId: session.organizationId,
      status: "ACTIVE",
      archivedAt: null
    }
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    title: user.title,
    userLevel: user.userLevel,
    departmentId: user.departmentId,
    managerId: user.managerId,
    directorId: user.directorId,
    permissions: await loadPermissions(user)
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new HttpError(401, "Authentication required.", "unauthorized");
  }
  return user;
}

export async function requirePermission(permission: PermissionKey) {
  const user = await requireUser();
  if (!user.permissions.includes(permission)) {
    throw new HttpError(403, "You do not have permission to perform this action.", "forbidden");
  }
  return user;
}

export function canAccessDepartment(user: AuthenticatedUser, departmentId?: string | null) {
  if (!departmentId) {
    return true;
  }
  if (user.userLevel === "GLOBAL_ADMIN" || user.userLevel === "DIRECTOR") {
    return true;
  }
  if (user.userLevel === "MANAGER") {
    return user.departmentId === departmentId;
  }
  return false;
}
