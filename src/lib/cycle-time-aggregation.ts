export type ActualSample = {
  quantity: number;
  actualSetupHours: number;
  actualCycleMinutesPerPiece: number;
};

export type AggregatedEstimate = {
  estimatedSetupHours: number;
  estimatedCycleMinutes: number;
  sampleSize: number;
  confidenceScore: number;
};

/**
 * Aggregate recorded job actuals into a single cycle-time estimate.
 *
 * - Setup hours: simple mean across jobs (one setup per job).
 * - Cycle minutes/piece: QUANTITY-WEIGHTED mean — a 500-piece run is a far
 *   more reliable measure of per-piece cycle than a 2-piece run, so it
 *   should pull the estimate harder.
 * - Confidence: sampleFactor × consistencyFactor, both in [0, 1]:
 *     sampleFactor      = min(1, n / TARGET_SAMPLES)  — more jobs, more trust
 *     consistencyFactor = clamp(1 - CV, FLOOR, 1)     — tighter spread, more trust
 *   where CV is the coefficient of variation of the per-piece cycle values.
 *
 * Returns null when there are no usable samples (caller keeps the prior
 * estimate untouched). Samples with quantity <= 0 are ignored.
 */
export function aggregateActuals(samples: ActualSample[]): AggregatedEstimate | null {
  const usable = samples.filter(
    (s) =>
      s.quantity > 0 &&
      Number.isFinite(s.actualSetupHours) &&
      Number.isFinite(s.actualCycleMinutesPerPiece) &&
      s.actualSetupHours >= 0 &&
      s.actualCycleMinutesPerPiece >= 0
  );

  if (usable.length === 0) {
    return null;
  }

  const n = usable.length;

  // Setup: simple mean.
  const setupMean = usable.reduce((sum, s) => sum + s.actualSetupHours, 0) / n;

  // Cycle: quantity-weighted mean.
  const totalQty = usable.reduce((sum, s) => sum + s.quantity, 0);
  const cycleWeighted =
    usable.reduce((sum, s) => sum + s.actualCycleMinutesPerPiece * s.quantity, 0) / totalQty;

  // Consistency from the (unweighted) cycle distribution.
  const cycleValues = usable.map((s) => s.actualCycleMinutesPerPiece);
  const cycleMeanUnweighted = cycleValues.reduce((a, b) => a + b, 0) / n;
  let consistencyFactor = 1;
  if (n >= 2 && cycleMeanUnweighted > 0) {
    const variance =
      cycleValues.reduce((sum, v) => sum + (v - cycleMeanUnweighted) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / cycleMeanUnweighted;
    consistencyFactor = clamp(1 - cv, CONSISTENCY_FLOOR, 1);
  }

  const TARGET_SAMPLES = 20;
  const sampleFactor = Math.min(1, n / TARGET_SAMPLES);
  const confidence = clamp(round(sampleFactor * consistencyFactor, 2), 0, 0.99);

  return {
    estimatedSetupHours: round(setupMean, 2),
    estimatedCycleMinutes: round(cycleWeighted, 3),
    sampleSize: n,
    confidenceScore: confidence
  };
}

const CONSISTENCY_FLOOR = 0.3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
