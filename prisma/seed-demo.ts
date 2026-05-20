import { PrismaClient, UserLevel } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seed is disabled. Set ALLOW_DEMO_SEED=true only in a non-production sandbox.");
  }

  const organization = await prisma.organization.findUniqueOrThrow({ where: { slug: "advanced" } });
  const department = await prisma.department.findFirstOrThrow({ where: { organizationId: organization.id, code: "PROD" } });
  const managerRole = await prisma.role.findFirstOrThrow({ where: { organizationId: organization.id, systemKey: "manager" } });
  const passwordHash = await bcrypt.hash("ChangeMeDemoOnly!123", 12);

  const manager = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: "manager@example.local" } },
    create: {
      organizationId: organization.id,
      email: "manager@example.local",
      passwordHash,
      firstName: "Demo",
      lastName: "Manager",
      title: "Operations Manager",
      userLevel: UserLevel.MANAGER,
      departmentId: department.id
    },
    update: { passwordHash, departmentId: department.id, userLevel: UserLevel.MANAGER }
  });

  await prisma.userRole.upsert({
    where: { organizationId_userId_roleId: { organizationId: organization.id, userId: manager.id, roleId: managerRole.id } },
    create: { organizationId: organization.id, userId: manager.id, roleId: managerRole.id },
    update: {}
  });

  const ticketCenter = await prisma.ticketCenter.findFirstOrThrow({ where: { organizationId: organization.id, departmentId: department.id } });
  await prisma.ticket.create({
    data: {
      organizationId: organization.id,
      ticketNumber: `TKT-DEMO-${Date.now()}`,
      departmentId: department.id,
      ticketCenterId: ticketCenter.id,
      title: "Demo production blocker",
      description: "Demo-only record for sandbox UI testing.",
      requestedById: manager.id,
      assignedManagerId: manager.id,
      assignedOwnerId: manager.id,
      ownerId: manager.id,
      priority: "HIGH",
      status: "New",
      createdById: manager.id
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
