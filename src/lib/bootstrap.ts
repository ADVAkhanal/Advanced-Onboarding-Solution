import { Prisma, UserLevel } from "@prisma/client";
import { hashPassword, verifyPassword } from "./auth";
import { PERMISSIONS, permissionsForLevel } from "./permissions";
import { prisma } from "./prisma";
import { BRAND_FOOTER, COMMERCIAL_NAME, DISCLAIMER, ENCLAVE_COMPATIBLE_STATEMENT, PRODUCT_NAME, SHORT_NAME, TAGLINE } from "./reference-data";

const ORGANIZATION_SLUG = "cleanops";

export async function ensureBootstrapAdmin() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    return null;
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) {
    return null;
  }

  const organization = await prisma.organization.upsert({
    where: { slug: ORGANIZATION_SLUG },
    create: {
      name: process.env.COMPANY_NAME?.trim() || "CleanOps Customer",
      slug: ORGANIZATION_SLUG,
      legalName: process.env.COMPANY_NAME?.trim() || undefined,
      brandName: "CleanOps",
      timezone: "America/Chicago",
      settings: {
        productName: PRODUCT_NAME,
        shortName: SHORT_NAME,
        commercialName: COMMERCIAL_NAME,
        tagline: TAGLINE,
        footer: BRAND_FOOTER,
        disclaimer: DISCLAIMER,
        enclaveCompatibleStatement: ENCLAVE_COMPATIBLE_STATEMENT
      }
    },
    update: {}
  });

  for (const [key, label] of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { organizationId_key: { organizationId: organization.id, key } },
      create: { organizationId: organization.id, key, label },
      update: { label }
    });
  }

  const roles = [
    { systemKey: "user", name: "User", userLevel: UserLevel.USER, description: "Standard employee and self-service user." },
    { systemKey: "manager", name: "Manager", userLevel: UserLevel.MANAGER, description: "Department owner and manager." },
    { systemKey: "director", name: "Director", userLevel: UserLevel.DIRECTOR, description: "Cross-department oversight role." },
    { systemKey: "admin", name: "Admin", userLevel: UserLevel.ADMIN, description: "Global Admin / CEO / system owner." }
  ];

  for (const roleDef of roles) {
    const role = await prisma.role.upsert({
      where: { organizationId_systemKey: { organizationId: organization.id, systemKey: roleDef.systemKey } },
      create: { organizationId: organization.id, ...roleDef },
      update: { name: roleDef.name, description: roleDef.description, userLevel: roleDef.userLevel }
    });

    const keys = permissionsForLevel(roleDef.userLevel);
    const permissionRows = await prisma.permission.findMany({
      where: { organizationId: organization.id, key: { in: keys } }
    });

    for (const permission of permissionRows) {
      await prisma.rolePermission.upsert({
        where: {
          organizationId_roleId_permissionId: {
            organizationId: organization.id,
            roleId: role.id,
            permissionId: permission.id
          }
        },
        create: { organizationId: organization.id, roleId: role.id, permissionId: permission.id },
        update: {}
      });
    }
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.user.create({
    data: {
      organizationId: organization.id,
      email,
      passwordHash,
      firstName: "Bootstrap",
      lastName: "Admin",
      title: "Admin",
      userLevel: UserLevel.ADMIN,
      status: "ACTIVE"
    }
  });

  const adminRole = await prisma.role.findFirstOrThrow({
    where: { organizationId: organization.id, systemKey: "admin" }
  });

  await prisma.userRole.create({
    data: {
      organizationId: organization.id,
      userId: admin.id,
      roleId: adminRole.id,
      createdById: admin.id
    }
  });

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      actorId: admin.id,
      action: "bootstrap.admin_created",
      entityType: "user",
      entityId: admin.id,
      outcome: "SUCCESS",
      reason: "First deploy bootstrap admin created from environment variables.",
      createdById: admin.id
    }
  });

  // Record a stable marker so future credential changes can be reconciled
  // even if the email changes.
  await prisma.organization.update({
    where: { id: organization.id },
    data: { settings: mergeSettings(organization.settings, { bootstrapAdminId: admin.id }) }
  });

  return admin;
}

/**
 * Keep the bootstrap admin's credentials in sync with the
 * BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD environment variables.
 *
 * ensureBootstrapAdmin() only runs on a brand-new install (zero users), so
 * once the admin exists, changing those env vars and redeploying would
 * otherwise have no effect — the stored email/hash would keep the old
 * values and login with the new credentials would be rejected. This
 * reconciliation closes that gap.
 *
 * Safety:
 * - Acts on exactly one identifiable bootstrap admin: the user recorded in
 *   organization.settings.bootstrapAdminId, else the user matching the env
 *   email, else the sole active ADMIN-tier user. If none can be identified
 *   unambiguously it does nothing.
 * - Never reassigns an email that another user already holds (would violate
 *   the (organizationId, email) unique constraint) — in that case it syncs
 *   the password only.
 * - Idempotent: once credentials match and the id is recorded, it performs
 *   no writes on subsequent logins.
 *
 * Because there is no in-app password-change feature, the environment is the
 * source of truth for the bootstrap admin credential by design.
 */
export async function reconcileBootstrapAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) {
    return null;
  }

  const organization = await prisma.organization.findFirst({ where: { slug: ORGANIZATION_SLUG } });
  if (!organization) {
    return null;
  }

  const settings = (organization.settings ?? {}) as Prisma.JsonObject;
  const recordedId = typeof settings.bootstrapAdminId === "string" ? settings.bootstrapAdminId : null;

  // Identify the bootstrap admin: recorded id → current env email → sole admin.
  let admin =
    (recordedId
      ? await prisma.user.findFirst({
          where: { id: recordedId, organizationId: organization.id, archivedAt: null }
        })
      : null) ??
    (await prisma.user.findFirst({
      where: { organizationId: organization.id, email, archivedAt: null }
    }));

  if (!admin) {
    const admins = await prisma.user.findMany({
      where: { organizationId: organization.id, userLevel: UserLevel.ADMIN, archivedAt: null },
      take: 2
    });
    if (admins.length === 1) {
      admin = admins[0];
    }
  }

  if (!admin) {
    // Can't safely identify the bootstrap admin — leave everything alone.
    return null;
  }

  const emailDrifted = admin.email !== email;
  const passwordDrifted = !(await verifyPassword(password, admin.passwordHash));
  const idUnrecorded = recordedId !== admin.id;

  if (!emailDrifted && !passwordDrifted && !idUnrecorded) {
    return admin;
  }

  const data: Prisma.UserUpdateInput = {};
  let appliedEmail = false;

  if (emailDrifted) {
    const clash = await prisma.user.findFirst({
      where: { organizationId: organization.id, email, NOT: { id: admin.id } },
      select: { id: true }
    });
    if (!clash) {
      data.email = email;
      appliedEmail = true;
    }
  }

  if (passwordDrifted) {
    data.passwordHash = await hashPassword(password);
  }

  if (Object.keys(data).length > 0) {
    admin = await prisma.user.update({ where: { id: admin.id }, data });
  }

  if (idUnrecorded) {
    await prisma.organization.update({
      where: { id: organization.id },
      data: { settings: mergeSettings(organization.settings, { bootstrapAdminId: admin.id }) }
    });
  }

  if (appliedEmail || passwordDrifted) {
    const changed = [appliedEmail ? "email" : null, passwordDrifted ? "password" : null]
      .filter(Boolean)
      .join(" and ");
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        actorId: admin.id,
        action: "bootstrap.admin_reconciled",
        entityType: "user",
        entityId: admin.id,
        outcome: "SUCCESS",
        reason: `Bootstrap admin ${changed} synced from environment variables.`,
        createdById: admin.id
      }
    });
  }

  return admin;
}

function mergeSettings(
  current: Prisma.JsonValue | null,
  patch: Record<string, string>
): Prisma.InputJsonValue {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as Prisma.JsonObject)
      : {};
  return { ...base, ...patch } as Prisma.InputJsonValue;
}
