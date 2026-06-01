/**
 * Pure machine-shop metric helpers. No DB, no clock — fully unit-tested.
 * Dashboard loaders supply the raw numbers; these define the formulas so
 * "utilization" / "on-time" / "rework rate" mean the same thing everywhere.
 */

/** Load as a percentage of capacity. 0 when capacity is non-positive. */
export function utilizationPct(loadHours: number, capacityHours: number): number {
  if (capacityHours <= 0) return 0;
  return Math.round((loadHours / capacityHours) * 100);
}

/** Rework/reject rate as a percentage. null when there's nothing decided. */
export function reworkRate(reworkCount: number, totalCount: number): number | null {
  if (totalCount <= 0) return null;
  return Math.round((reworkCount / totalCount) * 100);
}

/**
 * On-time completion rate among items that have a due date. Returns a 0–100
 * percentage, or null when no items have a due date. An item is on time when
 * completedAtMs <= dueMs.
 */
export function onTimeRate(items: Array<{ completedAtMs: number; dueMs: number | null }>): number | null {
  const withDue = items.filter((i) => i.dueMs !== null);
  if (withDue.length === 0) return null;
  const onTime = withDue.filter((i) => i.completedAtMs <= (i.dueMs as number)).length;
  return Math.round((onTime / withDue.length) * 100);
}

/** Average age in whole days from each timestamp to now. null when empty. */
export function averageAgeDays(fromMs: number[], nowMs: number): number | null {
  if (fromMs.length === 0) return null;
  const totalDays = fromMs.reduce((sum, ms) => sum + Math.max(0, (nowMs - ms) / 86_400_000), 0);
  return Math.round(totalDays / fromMs.length);
}

/** Oldest age in whole days, or null when empty. */
export function maxAgeDays(fromMs: number[], nowMs: number): number | null {
  if (fromMs.length === 0) return null;
  const oldest = Math.min(...fromMs);
  return Math.max(0, Math.floor((nowMs - oldest) / 86_400_000));
}
