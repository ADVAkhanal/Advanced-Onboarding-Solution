import {
  ComplexityClass,
  DiameterClass,
  ManufacturingProcess,
  MaterialCategory,
  PrismaClient,
  UserLevel
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type CycleTimeSeed = {
  materialCategory: MaterialCategory;
  process: ManufacturingProcess;
  complexityClass: ComplexityClass;
  diameterClass: DiameterClass;
  estimatedSetupHours: number;
  estimatedCycleMinutes: number;
  sampleSize: number;
  confidenceScore: number;
  notes?: string;
};

// Representative buckets for a precision-machining demo shop. Numbers are
// realistic-but-illustrative — every real shop should recalibrate from its
// own historical job data. No CUI alloy specs anywhere; broad buckets only.
const CYCLE_TIME_SEEDS: CycleTimeSeed[] = [
  // Aluminum — fast, low setup
  {
    materialCategory: "ALUMINUM",
    process: "TURNING",
    complexityClass: "SIMPLE",
    diameterClass: "FROM_25_TO_75_MM",
    estimatedSetupHours: 0.5,
    estimatedCycleMinutes: 3.0,
    sampleSize: 48,
    confidenceScore: 0.92
  },
  {
    materialCategory: "ALUMINUM",
    process: "TURNING",
    complexityClass: "MODERATE",
    diameterClass: "FROM_25_TO_75_MM",
    estimatedSetupHours: 1.0,
    estimatedCycleMinutes: 7.0,
    sampleSize: 32,
    confidenceScore: 0.88
  },
  {
    materialCategory: "ALUMINUM",
    process: "MILLING",
    complexityClass: "SIMPLE",
    diameterClass: "NOT_APPLICABLE",
    estimatedSetupHours: 0.75,
    estimatedCycleMinutes: 8.0,
    sampleSize: 40,
    confidenceScore: 0.9
  },
  {
    materialCategory: "ALUMINUM",
    process: "MILLING",
    complexityClass: "COMPLEX",
    diameterClass: "NOT_APPLICABLE",
    estimatedSetupHours: 2.5,
    estimatedCycleMinutes: 22.0,
    sampleSize: 18,
    confidenceScore: 0.78
  },
  // Stainless — harder than aluminum, slower cycles
  {
    materialCategory: "STAINLESS_STEEL",
    process: "TURNING",
    complexityClass: "SIMPLE",
    diameterClass: "FROM_25_TO_75_MM",
    estimatedSetupHours: 1.0,
    estimatedCycleMinutes: 8.0,
    sampleSize: 36,
    confidenceScore: 0.87
  },
  {
    materialCategory: "STAINLESS_STEEL",
    process: "TURNING",
    complexityClass: "MODERATE",
    diameterClass: "FROM_25_TO_75_MM",
    estimatedSetupHours: 1.5,
    estimatedCycleMinutes: 14.0,
    sampleSize: 28,
    confidenceScore: 0.84
  },
  {
    materialCategory: "STAINLESS_STEEL",
    process: "TURNING",
    complexityClass: "COMPLEX",
    diameterClass: "FROM_75_TO_150_MM",
    estimatedSetupHours: 3.0,
    estimatedCycleMinutes: 28.0,
    sampleSize: 14,
    confidenceScore: 0.7
  },
  {
    materialCategory: "STAINLESS_STEEL",
    process: "MILLING",
    complexityClass: "COMPLEX",
    diameterClass: "NOT_APPLICABLE",
    estimatedSetupHours: 3.0,
    estimatedCycleMinutes: 35.0,
    sampleSize: 12,
    confidenceScore: 0.68
  },
  // Alloy steel — comparable to stainless
  {
    materialCategory: "ALLOY_STEEL",
    process: "TURNING",
    complexityClass: "MODERATE",
    diameterClass: "FROM_25_TO_75_MM",
    estimatedSetupHours: 1.5,
    estimatedCycleMinutes: 11.0,
    sampleSize: 24,
    confidenceScore: 0.82
  },
  {
    materialCategory: "ALLOY_STEEL",
    process: "MILLING",
    complexityClass: "COMPLEX",
    diameterClass: "NOT_APPLICABLE",
    estimatedSetupHours: 3.0,
    estimatedCycleMinutes: 30.0,
    sampleSize: 10,
    confidenceScore: 0.66
  },
  // Titanium — slow, high setup, the load-bearing example for the strategic note
  {
    materialCategory: "TITANIUM",
    process: "TURNING",
    complexityClass: "SIMPLE",
    diameterClass: "UNDER_25_MM",
    estimatedSetupHours: 1.5,
    estimatedCycleMinutes: 10.0,
    sampleSize: 22,
    confidenceScore: 0.81
  },
  {
    materialCategory: "TITANIUM",
    process: "TURNING",
    complexityClass: "COMPLEX",
    diameterClass: "FROM_25_TO_75_MM",
    estimatedSetupHours: 4.0,
    estimatedCycleMinutes: 35.0,
    sampleSize: 9,
    confidenceScore: 0.62,
    notes: "Limited samples — review estimate against last completed job."
  },
  {
    materialCategory: "TITANIUM",
    process: "MILLING",
    complexityClass: "COMPLEX",
    diameterClass: "NOT_APPLICABLE",
    estimatedSetupHours: 5.0,
    estimatedCycleMinutes: 45.0,
    sampleSize: 6,
    confidenceScore: 0.55,
    notes: "Few historical jobs — confirm tooling with shop lead before quoting."
  },
  // Brass — fast, low setup
  {
    materialCategory: "BRASS",
    process: "TURNING",
    complexityClass: "SIMPLE",
    diameterClass: "UNDER_25_MM",
    estimatedSetupHours: 0.5,
    estimatedCycleMinutes: 2.0,
    sampleSize: 30,
    confidenceScore: 0.9
  },
  // Nickel alloy — hardest material in the mix
  {
    materialCategory: "NICKEL_ALLOY",
    process: "TURNING",
    complexityClass: "COMPLEX",
    diameterClass: "FROM_25_TO_75_MM",
    estimatedSetupHours: 4.0,
    estimatedCycleMinutes: 38.0,
    sampleSize: 8,
    confidenceScore: 0.6,
    notes: "Specialty tooling required — confirm availability before quote."
  },
  // Plastic — fastest cycles in the shop
  {
    materialCategory: "PLASTIC",
    process: "MILLING",
    complexityClass: "SIMPLE",
    diameterClass: "NOT_APPLICABLE",
    estimatedSetupHours: 0.5,
    estimatedCycleMinutes: 4.0,
    sampleSize: 20,
    confidenceScore: 0.85
  },
  // Inspection bucket — diameter not applicable
  {
    materialCategory: "OTHER",
    process: "INSPECTION",
    complexityClass: "MODERATE",
    diameterClass: "NOT_APPLICABLE",
    estimatedSetupHours: 0.25,
    estimatedCycleMinutes: 5.0,
    sampleSize: 50,
    confidenceScore: 0.88,
    notes: "Per-feature CMM time. Adjust by feature count when quoting."
  }
];

async function main() {
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seed is disabled. Set ALLOW_DEMO_SEED=true only in a non-production sandbox.");
  }

  const organization = await prisma.organization.findUniqueOrThrow({ where: { slug: "cleanops" } });
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

  // Seed cycle-time lookups so the manufacturing quote intake form has
  // real matches to show. Idempotent via the unique bucket constraint.
  const now = new Date();
  for (const seed of CYCLE_TIME_SEEDS) {
    await prisma.cycleTimeLookup.upsert({
      where: {
        organizationId_materialCategory_process_complexityClass_diameterClass: {
          organizationId: organization.id,
          materialCategory: seed.materialCategory,
          process: seed.process,
          complexityClass: seed.complexityClass,
          diameterClass: seed.diameterClass
        }
      },
      create: {
        organizationId: organization.id,
        materialCategory: seed.materialCategory,
        process: seed.process,
        complexityClass: seed.complexityClass,
        diameterClass: seed.diameterClass,
        estimatedSetupHours: seed.estimatedSetupHours,
        estimatedCycleMinutes: seed.estimatedCycleMinutes,
        sampleSize: seed.sampleSize,
        confidenceScore: seed.confidenceScore,
        lastReviewedAt: now,
        reviewedById: manager.id,
        notes: seed.notes,
        createdById: manager.id,
        updatedById: manager.id
      },
      update: {
        estimatedSetupHours: seed.estimatedSetupHours,
        estimatedCycleMinutes: seed.estimatedCycleMinutes,
        sampleSize: seed.sampleSize,
        confidenceScore: seed.confidenceScore,
        lastReviewedAt: now,
        reviewedById: manager.id,
        notes: seed.notes,
        updatedById: manager.id
      }
    });
  }

  console.log(`Seeded ${CYCLE_TIME_SEEDS.length} cycle-time lookup buckets.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
