import { prisma } from "./prisma";
import type { PmFrequency } from "./maintenance";

/**
 * Maintenance baseline seed — the real Advanced PMC machine roster, MRO supply
 * list, and per-category PM cadence. All operational metadata: equipment names,
 * work envelopes (published machine specs), consumable supplies, and generic PM
 * intervals. No serial numbers, CUI, ITAR, or proprietary process parameters.
 *
 * Idempotent: seedMaintenanceBaseline() is a no-op once any machine exists for
 * the organization. Triggered on demand from the Maintenance overview (manage
 * permission), not on every boot.
 */

type SeedMachine = {
  code: string;
  name: string;
  category: string;
  building: number;
  envelope?: string;
  footprint?: string;
  notes?: string;
};

// CNC machines (work envelopes are published machine specs).
const SEED_MACHINES: SeedMachine[] = [
  { code: "505", name: "HAAS UMC-750 5 AXIS (2)", category: "5-Axis", building: 1, envelope: 'X 28" Y 20" Z 20"', footprint: "22'×18'" },
  { code: "402", name: "Mazak HCN-4000 III", category: "4-Axis", building: 1, envelope: 'X 22" Y 25" Z 25"', footprint: "22'×18'" },
  { code: "401", name: "Mazak HCN-4000 II", category: "4-Axis", building: 1, envelope: 'X 22" Y 25" Z 25"', footprint: "22'×18'" },
  { code: "306", name: "Komo VR510 CNC Router", category: "Router", building: 1, envelope: 'X 120" Y 60" Z 4"', footprint: "18'×15'" },
  { code: "506", name: "C.R. Onsrud 5 AXIS", category: "Router", building: 1, envelope: 'X 60" Y 36" Z 20"', footprint: "18'×15'" },
  { code: "301", name: "Mazak VCN510CKY (1)", category: "3-Axis", building: 2, envelope: 'X 41" Y 20" Z 20"', footprint: "18'×15'" },
  { code: "303", name: "Mazak VCN510CKY w/ 4-Ax Rotary", category: "3-Axis", building: 2, envelope: 'X 41" Y 20" Z 20"', footprint: "18'×15'" },
  { code: "302", name: "Mazak VCN510CKY (2)", category: "3-Axis", building: 2, envelope: 'X 41" Y 20" Z 20"', footprint: "18'×15'" },
  { code: "201", name: "Mazak Integrex 200-3ST", category: "Mill-Turn", building: 2, envelope: 'X ⌀26" Y 5" Z 40"', footprint: "18'×15'" },
  { code: "202", name: "Mazak Integrex 100-4ST", category: "Mill-Turn", building: 2, envelope: 'X ⌀21" Y 5" Z 36"', footprint: "18'×15'" },
  { code: "105", name: "Hyundai L 2100SY", category: "Mill-Turn", building: 2, envelope: 'X ⌀13" Y 4" Z 15"', footprint: "18'×15'" },
  { code: "104", name: "Mazak Quick Turn 10", category: "Lathe", building: 2, envelope: 'X ⌀10" Z 11"', footprint: "18'×15'" },
  { code: "102", name: "Mazak Quick Turn 250 II", category: "Lathe", building: 2, envelope: 'X ⌀14" Z 22"', footprint: "18'×15'" },
  { code: "103", name: "Mazak Quick Turn 6T", category: "Lathe", building: 2, envelope: 'X ⌀5" Z 7"', footprint: "18'×15'" },
  { code: "101", name: "Mazak QTN-250 MSY", category: "Lathe", building: 2, envelope: 'X ⌀14" Y 4" Z 22"', footprint: "18'×15'" },
  { code: "510", name: "Fastems ROBO FMS One", category: "5-Axis", building: 3, envelope: 'X 22" Y 22" Z 19.69"', footprint: "45'×30'" },
  { code: "503", name: "Okuma M460V-5AX", category: "5-Axis", building: 3, envelope: 'X 19" Y 18" Z 18.11"', footprint: "18'×15'" },
  { code: "508", name: "Okuma M460V-5AX", category: "5-Axis", building: 3, envelope: 'X 19" Y 18" Z 18.11"', footprint: "18'×15'" },
  { code: "509", name: "Okuma M460V-5AX", category: "5-Axis", building: 3, envelope: 'X 19" Y 18" Z 18.11"', footprint: "18'×15'" },
  { code: "504", name: "HAAS UMC-750 5 AXIS (1)", category: "5-Axis", building: 3, envelope: 'X 28" Y 20" Z 20"', footprint: "22'×18'" },
  { code: "205", name: "Okuma MULTUS U3000", category: "Mill-Turn", building: 3, envelope: 'X ⌀25" Y 10" Z 59"', footprint: "18'×15'" },
  // Support / inspection equipment
  { code: "SAW", name: "Hem-Saw", category: "Support", building: 1 },
  { code: "SUN", name: "Sunnen Hone", category: "Support", building: 1 },
  { code: "GUN", name: "Gundrill", category: "Support", building: 1 },
  { code: "TAP", name: "Tapping Machine", category: "Support", building: 1 },
  { code: "DEB", name: "Deburr Station", category: "Support", building: 2 },
  { code: "CMM", name: "QC Lab CMM", category: "Inspection", building: 2, notes: "Coordinate measuring machine in QC Lab" },
  { code: "MAT", name: "Matsura MAM72", category: "Mill-Turn", building: 3 },
  { code: "GR1", name: "Grinding Machine 1", category: "Support", building: 3 },
  { code: "GR2", name: "Grinding Machine 2", category: "Support", building: 3 }
];

// Per-category PM cadence. Generic preventive maintenance — not process parameters.
const PM_TEMPLATES: Record<string, Array<{ title: string; freq: PmFrequency; mins: number }>> = {
  "5-Axis": [
    { title: "Daily: way-lube levels / air pressure / coolant level", freq: "daily", mins: 10 },
    { title: "Weekly: chip evacuation, filter inspection, probe check", freq: "weekly", mins: 30 },
    { title: "Monthly: spindle warm-up routine + geometry check", freq: "monthly", mins: 60 },
    { title: "Quarterly: backup battery voltage, ballbar test, trunnion lube", freq: "quarterly", mins: 90 },
    { title: "Annual: laser cal, ballbar, manufacturer service inspection", freq: "annual", mins: 240 }
  ],
  "4-Axis": [
    { title: "Daily: way-lube / air / coolant level", freq: "daily", mins: 10 },
    { title: "Weekly: chip wash, coolant concentration, filter", freq: "weekly", mins: 25 },
    { title: "Monthly: rotary axis lube, spindle warm-up", freq: "monthly", mins: 45 },
    { title: "Quarterly: ballbar test, battery voltages", freq: "quarterly", mins: 60 },
    { title: "Annual: ballbar, factory service inspection", freq: "annual", mins: 180 }
  ],
  "3-Axis": [
    { title: "Daily: way-lube / air / coolant level", freq: "daily", mins: 10 },
    { title: "Weekly: chip evacuation, filter clean", freq: "weekly", mins: 20 },
    { title: "Monthly: spindle warm-up, geometry", freq: "monthly", mins: 45 },
    { title: "Quarterly: battery voltages, ballbar", freq: "quarterly", mins: 60 },
    { title: "Annual: ballbar, service inspection", freq: "annual", mins: 150 }
  ],
  Lathe: [
    { title: "Daily: way-lube, chuck air, tailstock grease", freq: "daily", mins: 8 },
    { title: "Weekly: chuck cleaning, turret indexing", freq: "weekly", mins: 25 },
    { title: "Monthly: spindle bearings check, coolant change", freq: "monthly", mins: 45 },
    { title: "Quarterly: battery, encoder check", freq: "quarterly", mins: 60 },
    { title: "Annual: alignment, factory inspection", freq: "annual", mins: 180 }
  ],
  "Mill-Turn": [
    { title: "Daily: lube, air, coolant, chuck", freq: "daily", mins: 12 },
    { title: "Weekly: turret clean, sub-spindle check", freq: "weekly", mins: 30 },
    { title: "Monthly: spindle / Y-axis / tailstock inspection", freq: "monthly", mins: 60 },
    { title: "Quarterly: ballbar test, batteries", freq: "quarterly", mins: 90 },
    { title: "Annual: laser cal, ballbar, manufacturer inspection", freq: "annual", mins: 240 }
  ],
  Router: [
    { title: "Daily: vacuum check, collet clean, dust collection", freq: "daily", mins: 10 },
    { title: "Weekly: rails wipe / lube, bed flatness check", freq: "weekly", mins: 25 },
    { title: "Monthly: spindle runout, table level", freq: "monthly", mins: 60 },
    { title: "Quarterly: drive belts, vacuum pump service", freq: "quarterly", mins: 90 },
    { title: "Annual: full service inspection", freq: "annual", mins: 180 }
  ],
  Support: [
    { title: "Monthly: general inspection / lube", freq: "monthly", mins: 20 },
    { title: "Annual: service inspection", freq: "annual", mins: 60 }
  ],
  Inspection: [
    { title: "Daily: warm-up routine / probe check", freq: "daily", mins: 10 },
    { title: "Weekly: stylus cal, granite clean", freq: "weekly", mins: 20 },
    { title: "Monthly: full cal-sphere verification", freq: "monthly", mins: 45 },
    { title: "Annual: ISO 10360 certification", freq: "annual", mins: 240 }
  ]
};

type SeedPart = {
  name: string;
  category: string;
  subCategory: string;
  unit: string;
  reorderPoint: number;
  qty: number;
  critical?: boolean;
};

// MRO consumables / supplies — mundane shop supplies, not production inventory.
const SEED_PARTS: SeedPart[] = [
  { name: "Letter copy paper", category: "Stationery", subCategory: "Office Paper & Forms", unit: "ream", reorderPoint: 10, qty: 24 },
  { name: "Carbonless NCR traveler forms", category: "Stationery", subCategory: "Office Paper & Forms", unit: "pack", reorderPoint: 5, qty: 15 },
  { name: "Permanent markers (fine tip)", category: "Stationery", subCategory: "Writing & Marking", unit: "each", reorderPoint: 12, qty: 24 },
  { name: "Paint markers", category: "Stationery", subCategory: "Writing & Marking", unit: "each", reorderPoint: 8, qty: 10 },
  { name: "Inspection red pens", category: "Stationery", subCategory: "Writing & Marking", unit: "each", reorderPoint: 6, qty: 12 },
  { name: "Thermal barcode labels", category: "Stationery", subCategory: "Labeling", unit: "roll", reorderPoint: 3, qty: 8 },
  { name: "Hazard labels (OSHA)", category: "Stationery", subCategory: "Labeling", unit: "pack", reorderPoint: 2, qty: 3 },
  { name: "Heavy-duty clipboards", category: "Stationery", subCategory: "Office Supplies", unit: "each", reorderPoint: 5, qty: 15 },
  { name: "Whiteboard markers", category: "Stationery", subCategory: "Office Supplies", unit: "each", reorderPoint: 10, qty: 24 },
  { name: "Anti-fatigue mats", category: "Furniture", subCategory: "Shop Floor", unit: "each", reorderPoint: 3, qty: 18 },
  { name: "Rolling tool carts", category: "Furniture", subCategory: "Shop Floor", unit: "each", reorderPoint: 1, qty: 10 },
  { name: "Corrugated boxes (small)", category: "Packaging", subCategory: "Boxes & Containers", unit: "each", reorderPoint: 50, qty: 120 },
  { name: "Corrugated boxes (medium)", category: "Packaging", subCategory: "Boxes & Containers", unit: "each", reorderPoint: 40, qty: 80 },
  { name: "Corrugated boxes (large)", category: "Packaging", subCategory: "Boxes & Containers", unit: "each", reorderPoint: 25, qty: 50 },
  { name: "Bubble wrap (small cell)", category: "Packaging", subCategory: "Protective Materials", unit: "roll", reorderPoint: 3, qty: 8 },
  { name: "VCI rust prevention paper", category: "Packaging", subCategory: "Protective Materials", unit: "roll", reorderPoint: 2, qty: 4 },
  { name: "Stretch wrap (hand roll)", category: "Packaging", subCategory: "Protective Materials", unit: "roll", reorderPoint: 6, qty: 14 },
  { name: "Industrial packing tape", category: "Packaging", subCategory: "Shipping Supplies", unit: "roll", reorderPoint: 12, qty: 36 },
  { name: "Standard pallets", category: "Packaging", subCategory: "Shipping Supplies", unit: "each", reorderPoint: 20, qty: 45 },
  { name: "Heat-treated export pallets", category: "Packaging", subCategory: "Shipping Supplies", unit: "each", reorderPoint: 8, qty: 18 },
  { name: "Fanuc control backup batteries", category: "Batteries", subCategory: "CNC Machine", unit: "each", reorderPoint: 6, qty: 12, critical: true },
  { name: "Haas control batteries", category: "Batteries", subCategory: "CNC Machine", unit: "each", reorderPoint: 4, qty: 8, critical: true },
  { name: "PLC backup batteries", category: "Batteries", subCategory: "CNC Machine", unit: "each", reorderPoint: 4, qty: 10, critical: true },
  { name: "Encoder batteries", category: "Batteries", subCategory: "CNC Machine", unit: "each", reorderPoint: 6, qty: 12, critical: true },
  { name: "AA alkaline batteries", category: "Batteries", subCategory: "Inspection Equipment", unit: "each", reorderPoint: 24, qty: 48 },
  { name: "CR2032 coin batteries", category: "Batteries", subCategory: "Inspection Equipment", unit: "each", reorderPoint: 10, qty: 20 },
  { name: "Cordless tool batteries", category: "Batteries", subCategory: "Shop Equipment", unit: "each", reorderPoint: 4, qty: 12 },
  { name: "Way lube (Mobil Vactra No. 2)", category: "Lubricants", subCategory: "Machine", unit: "gal", reorderPoint: 4, qty: 10, critical: true },
  { name: "Spindle coolant concentrate", category: "Lubricants", subCategory: "Machine", unit: "drum", reorderPoint: 1, qty: 3, critical: true },
  { name: "Air filter elements", category: "Filters", subCategory: "Machine", unit: "each", reorderPoint: 8, qty: 16 },
  { name: "Coolant filter media", category: "Filters", subCategory: "Machine", unit: "roll", reorderPoint: 3, qty: 6 }
];

export type SeedResult = {
  skipped: boolean;
  machines: number;
  pmTasks: number;
  parts: number;
};

/**
 * Seed the maintenance baseline for an org. No-op if any machine already
 * exists (so it never duplicates). Returns counts created.
 */
export async function seedMaintenanceBaseline(organizationId: string, userId?: string): Promise<SeedResult> {
  const existing = await prisma.machine.count({ where: { organizationId } });
  if (existing > 0) {
    return { skipped: true, machines: 0, pmTasks: 0, parts: 0 };
  }

  const now = new Date();
  let pmTaskCount = 0;

  // Create machines one at a time so we can attach PM tasks to each id.
  let machineIndex = 0;
  for (const m of SEED_MACHINES) {
    const machine = await prisma.machine.create({
      data: {
        organizationId,
        code: m.code,
        name: m.name,
        category: m.category,
        building: m.building,
        envelope: m.envelope ?? null,
        footprint: m.footprint ?? null,
        notes: m.notes ?? null,
        status: "running",
        createdById: userId,
        updatedById: userId
      }
    });

    const templates = PM_TEMPLATES[m.category] ?? PM_TEMPLATES["3-Axis"];
    const pmRows = templates.map((t, i) => {
      // Stagger first-due dates across the next ~2 weeks so they don't pile up.
      const offsetDays = i * 2 + (machineIndex % 5);
      const nextDue = new Date(now);
      nextDue.setDate(nextDue.getDate() + offsetDays);
      return {
        organizationId,
        machineId: machine.id,
        title: t.title,
        frequency: t.freq,
        estMinutes: t.mins,
        nextDueAt: nextDue,
        createdById: userId,
        updatedById: userId
      };
    });
    if (pmRows.length) {
      await prisma.pmTask.createMany({ data: pmRows });
      pmTaskCount += pmRows.length;
    }
    machineIndex += 1;
  }

  await prisma.maintenancePart.createMany({
    data: SEED_PARTS.map((p) => ({
      organizationId,
      name: p.name,
      category: p.category,
      subCategory: p.subCategory,
      unit: p.unit,
      quantityOnHand: p.qty,
      reorderPoint: p.reorderPoint,
      critical: p.critical ?? false,
      createdById: userId,
      updatedById: userId
    }))
  });

  return { skipped: false, machines: SEED_MACHINES.length, pmTasks: pmTaskCount, parts: SEED_PARTS.length };
}
