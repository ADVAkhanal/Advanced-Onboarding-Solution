import { UserLevel } from "@prisma/client";
import { hashPassword } from "./auth";
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

  return admin;
}
