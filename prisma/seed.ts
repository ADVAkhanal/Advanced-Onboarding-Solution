import { PrismaClient, UserLevel } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  BRAND_FOOTER,
  COMMERCIAL_NAME,
  DEPARTMENTS,
  DISCLAIMER,
  PRODUCT_NAME,
  REPORT_TYPES,
  SHORT_NAME,
  TAGLINE,
  categoriesForDepartment,
  slugify
} from "../src/lib/reference-data";
import { PERMISSIONS, permissionsForLevel } from "../src/lib/permissions";

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "advanced" },
    create: {
      name: "ADVANCED",
      slug: "advanced",
      legalName: "Advanced Consulting Inc.",
      brandName: "ADVANCED",
      timezone: "America/Chicago",
      settings: {
        productName: PRODUCT_NAME,
        shortName: SHORT_NAME,
        commercialName: COMMERCIAL_NAME,
        tagline: TAGLINE,
        footer: BRAND_FOOTER,
        disclaimer: DISCLAIMER
      }
    },
    update: {
      name: "ADVANCED",
      legalName: "Advanced Consulting Inc.",
      brandName: "ADVANCED"
    }
  });

  for (const [key, label] of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { organizationId_key: { organizationId: organization.id, key } },
      create: {
        organizationId: organization.id,
        key,
        label
      },
      update: { label }
    });
  }

  const roles = [
    {
      systemKey: "level_1_user",
      name: "Level 1 User",
      userLevel: UserLevel.LEVEL_1,
      description: "Employee, contractor, temp worker, or shop-floor user with self-service access."
    },
    {
      systemKey: "manager",
      name: "Manager",
      userLevel: UserLevel.MANAGER,
      description: "Department owner for tickets, onboarding, payroll coordination requests, tasks, and follow-through."
    },
    {
      systemKey: "director",
      name: "Director",
      userLevel: UserLevel.DIRECTOR,
      description: "Cross-department oversight and escalation authority."
    },
    {
      systemKey: "global_admin_ceo",
      name: "Global Admin / CEO",
      userLevel: UserLevel.GLOBAL_ADMIN,
      description: "Full system owner and executive controller."
    }
  ];

  for (const roleDef of roles) {
    const role = await prisma.role.upsert({
      where: { organizationId_systemKey: { organizationId: organization.id, systemKey: roleDef.systemKey } },
      create: {
        organizationId: organization.id,
        ...roleDef
      },
      update: {
        name: roleDef.name,
        description: roleDef.description,
        userLevel: roleDef.userLevel
      }
    });

    const permissionKeys = permissionsForLevel(roleDef.userLevel);
    const permissionRows = await prisma.permission.findMany({
      where: { organizationId: organization.id, key: { in: permissionKeys } }
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
        create: {
          organizationId: organization.id,
          roleId: role.id,
          permissionId: permission.id
        },
        update: {}
      });
    }
  }

  const location = await prisma.location.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "PLANT-1" } },
    create: {
      organizationId: organization.id,
      name: "Plant 1 - Shop Floor",
      code: "PLANT-1"
    },
    update: { name: "Plant 1 - Shop Floor" }
  });

  for (const shift of [
    { code: "DAY", name: "Day Shift", startTime: "06:00", endTime: "14:00" },
    { code: "SECOND", name: "2nd Shift", startTime: "14:00", endTime: "22:00" },
    { code: "NIGHT", name: "Night Shift", startTime: "22:00", endTime: "06:00" }
  ]) {
    await prisma.shift.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: shift.code } },
      create: { organizationId: organization.id, ...shift },
      update: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime }
    });
  }

  for (const departmentDef of DEPARTMENTS) {
    const department = await prisma.department.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: departmentDef.code } },
      create: {
        organizationId: organization.id,
        name: departmentDef.name,
        code: departmentDef.code,
        locationId: location.id,
        description: `${departmentDef.name} internal operations and request ownership.`
      },
      update: {
        name: departmentDef.name,
        locationId: location.id
      }
    });

    const center = await prisma.ticketCenter.upsert({
      where: { organizationId_slug: { organizationId: organization.id, slug: slugify(departmentDef.center) } },
      create: {
        organizationId: organization.id,
        departmentId: department.id,
        name: departmentDef.center,
        slug: slugify(departmentDef.center),
        routingRules: {
          managersSeeOwnDepartment: true,
          directorsSeeAssignedDepartments: true,
          globalAdminsSeeAll: true
        },
        metricsConfig: {
          trackAging: true,
          trackWorkStoppage: true,
          requireOwnerAndDueDate: true
        }
      },
      update: {
        departmentId: department.id,
        name: departmentDef.center
      }
    });

    for (const categoryName of categoriesForDepartment(departmentDef.code)) {
      await prisma.ticketCategory.upsert({
        where: {
          organizationId_ticketCenterId_slug: {
            organizationId: organization.id,
            ticketCenterId: center.id,
            slug: slugify(categoryName)
          }
        },
        create: {
          organizationId: organization.id,
          departmentId: department.id,
          ticketCenterId: center.id,
          name: categoryName,
          slug: slugify(categoryName)
        },
        update: {
          name: categoryName,
          departmentId: department.id
        }
      });
    }
  }

  for (const title of [
    "Operations Manager",
    "CNC Machinist",
    "Quality Inspector",
    "Maintenance Technician",
    "Shipping / Receiving Clerk",
    "Payroll Coordinator",
    "HR Coordinator",
    "Production Lead",
    "Engineering Programmer"
  ]) {
    const existing = await prisma.jobTitle.findFirst({
      where: { organizationId: organization.id, title }
    });
    if (!existing) {
      await prisma.jobTitle.create({
        data: {
        organizationId: organization.id,
        title,
        code: slugify(title).toUpperCase()
        }
      });
    }
  }

  for (const reportType of REPORT_TYPES) {
    await prisma.reportTemplate.upsert({
      where: { organizationId_reportType: { organizationId: organization.id, reportType } },
      create: {
        organizationId: organization.id,
        reportType,
        title: reportType,
        description: `${reportType} with branded header, generated timestamp, filters, summary metrics, detail rows, internal-use footer, report ID, and export history.`
      },
      update: {
        title: reportType
      }
    });
  }

  for (const setting of [
    {
      key: "product.disclaimer",
      value: DISCLAIMER,
      description: "Persistent disclaimer shown across the app."
    },
    {
      key: "payroll.safety",
      value: {
        coordinationOnly: true,
        noBankAccounts: true,
        noFullSsn: true,
        noTaxCalculation: true,
        noDirectPayrollProcessing: true
      },
      description: "Payroll safety boundary."
    },
    {
      key: "uploads.allowedMimeTypes",
      value: ["application/pdf", "image/png", "image/jpeg", "text/csv", "text/plain"],
      description: "Allowed non-sensitive upload types."
    },
    {
      key: "exports.safePayrollFields",
      value: ["requestNumber", "employeeProfileId", "departmentId", "requestType", "effectiveDate", "proposedChangeSummary", "businessReason", "status"],
      description: "Safe payroll export fields only."
    }
  ]) {
    await prisma.setting.upsert({
      where: { organizationId_key: { organizationId: organization.id, key: setting.key } },
      create: {
        organizationId: organization.id,
        key: setting.key,
        value: setting.value,
        description: setting.description
      },
      update: {
        value: setting.value,
        description: setting.description
      }
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.upsert({
      where: { organizationId_email: { organizationId: organization.id, email: adminEmail.toLowerCase() } },
      create: {
        organizationId: organization.id,
        email: adminEmail.toLowerCase(),
        passwordHash,
        firstName: "System",
        lastName: "Administrator",
        title: "Global Admin / CEO",
        userLevel: UserLevel.GLOBAL_ADMIN
      },
      update: {
        passwordHash,
        userLevel: UserLevel.GLOBAL_ADMIN,
        status: "ACTIVE"
      }
    });

    const adminRole = await prisma.role.findFirstOrThrow({
      where: { organizationId: organization.id, systemKey: "global_admin_ceo" }
    });

    await prisma.userRole.upsert({
      where: {
        organizationId_userId_roleId: {
          organizationId: organization.id,
          userId: admin.id,
          roleId: adminRole.id
        }
      },
      create: {
        organizationId: organization.id,
        userId: admin.id,
        roleId: adminRole.id
      },
      update: {}
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      action: "reference_seed_completed",
      entityType: "system",
      outcome: "SUCCESS",
      reason: "Safe reference configuration loaded without demo production records."
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
