import type {
  ComplexityClass,
  DiameterClass,
  ManufacturingProcess,
  MaterialCategory
} from "@prisma/client";
import { prisma } from "./prisma";

export type CycleTimeBucket = {
  materialCategory: MaterialCategory;
  process: ManufacturingProcess;
  complexityClass: ComplexityClass;
  diameterClass: DiameterClass;
};

/**
 * Find the cycle-time lookup row matching a (material, process, complexity,
 * diameter) bucket for the given organization. Returns null when no row
 * matches — callers fall back to operator-entered estimates.
 *
 * The unique index `cycle_time_lookups_bucket_unique` guarantees at most
 * one ACTIVE row per bucket, so `findFirst` is safe here.
 */
export async function findCycleTimeLookup(organizationId: string, bucket: CycleTimeBucket) {
  return prisma.cycleTimeLookup.findFirst({
    where: {
      organizationId,
      status: "ACTIVE",
      archivedAt: null,
      ...bucket
    }
  });
}

export type LineEstimateInput = {
  quantity: number;
  setupHours: number;
  cycleMinutesPerPiece: number;
  materialCostPerUnit: number;
  laborRatePerHour: number;
  burdenRatePerHour: number;
  marginPercent: number;
};

export type LineEstimate = {
  totalHours: number;
  laborCost: number;
  burdenCost: number;
  materialCost: number;
  subtotal: number;
  marginAmount: number;
  total: number;
  unitPrice: number;
};

/**
 * Pure quote-line estimate. All inputs are scalars; no DB calls.
 *
 * total = (setup + cycle*qty/60) * (labor + burden) + material*qty
 *         all marked up so margin % of the TOTAL covers margin.
 * unitPrice = total / qty
 *
 * Margins are applied as a divisor (markup), not a multiplier, so the
 * resulting margin matches the requested percent of the final price.
 * Example: 25% margin on $100 cost → $133.33 total → 25% of $133.33 = $33.33.
 */
export function estimateLine(input: LineEstimateInput): LineEstimate {
  const quantity = Math.max(0, input.quantity);
  const setupHours = Math.max(0, input.setupHours);
  const cycleHours = quantity > 0 ? (input.cycleMinutesPerPiece * quantity) / 60 : 0;
  const totalHours = setupHours + cycleHours;

  const laborCost = totalHours * input.laborRatePerHour;
  const burdenCost = totalHours * input.burdenRatePerHour;
  const materialCost = input.materialCostPerUnit * quantity;
  const subtotal = laborCost + burdenCost + materialCost;

  const marginFraction = Math.min(Math.max(input.marginPercent / 100, 0), 0.95);
  const total = marginFraction > 0 ? subtotal / (1 - marginFraction) : subtotal;
  const marginAmount = total - subtotal;
  const unitPrice = quantity > 0 ? total / quantity : 0;

  return {
    totalHours: round(totalHours, 2),
    laborCost: round(laborCost, 2),
    burdenCost: round(burdenCost, 2),
    materialCost: round(materialCost, 2),
    subtotal: round(subtotal, 2),
    marginAmount: round(marginAmount, 2),
    total: round(total, 2),
    unitPrice: round(unitPrice, 4)
  };
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Human-readable label for a manufacturing process enum. Keep in sync with
 * prisma/schema.prisma `ManufacturingProcess`.
 */
export function processLabel(process: ManufacturingProcess): string {
  const map: Record<ManufacturingProcess, string> = {
    TURNING: "Turning",
    MILLING: "Milling",
    MULTI_SPINDLE: "Multi-spindle",
    SWISS_TURNING: "Swiss turning",
    GRINDING: "Grinding",
    EDM: "EDM",
    WIRE_EDM: "Wire EDM",
    HONING: "Honing",
    LAPPING: "Lapping",
    INSPECTION: "Inspection",
    ASSEMBLY: "Assembly",
    OTHER: "Other"
  };
  return map[process];
}

export function materialLabel(material: MaterialCategory): string {
  const map: Record<MaterialCategory, string> = {
    ALLOY_STEEL: "Alloy steel",
    STAINLESS_STEEL: "Stainless steel",
    CARBON_STEEL: "Carbon steel",
    ALUMINUM: "Aluminum",
    TITANIUM: "Titanium",
    BRASS: "Brass",
    COPPER: "Copper",
    NICKEL_ALLOY: "Nickel alloy",
    PLASTIC: "Plastic",
    COMPOSITE: "Composite",
    OTHER: "Other"
  };
  return map[material];
}

export function complexityLabel(complexity: ComplexityClass): string {
  const map: Record<ComplexityClass, string> = {
    SIMPLE: "Simple",
    MODERATE: "Moderate",
    COMPLEX: "Complex",
    HIGHLY_COMPLEX: "Highly complex"
  };
  return map[complexity];
}

export function diameterLabel(diameter: DiameterClass): string {
  const map: Record<DiameterClass, string> = {
    UNDER_25_MM: "Under 25 mm",
    FROM_25_TO_75_MM: "25 to 75 mm",
    FROM_75_TO_150_MM: "75 to 150 mm",
    FROM_150_TO_300_MM: "150 to 300 mm",
    OVER_300_MM: "Over 300 mm",
    NOT_APPLICABLE: "Not applicable"
  };
  return map[diameter];
}
