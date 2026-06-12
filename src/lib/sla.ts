/**
 * Ticket SLA helpers — pure, no DB, no clock; fully unit-tested.
 *
 * Mirrors the standalone Helpdesk app's SLA model mapped onto this platform's
 * RequestPriority vocabulary: each priority gets a response window in hours,
 * the clock runs from ticket creation until it is satisfied (closed/resolved),
 * and the state bands are ok (< 75% of window), risk (75–99%), breach (≥ 100%).
 */

export const SLA_RESPONSE_HOURS: Record<string, number> = {
  WORK_STOPPAGE: 1,
  URGENT: 2,
  HIGH: 4,
  NORMAL: 24,
  LOW: 72
};

const DEFAULT_WINDOW_HOURS = 24;
const RISK_THRESHOLD_PCT = 75;

export type SlaState = "ok" | "risk" | "breach";

export type SlaAssessment = {
  state: SlaState;
  /** Elapsed time as a whole-number percentage of the window. */
  pct: number;
  /** Whole hours past the deadline; null while inside the window. */
  hoursOver: number | null;
  windowHours: number;
  /** True when the clock was stopped by satisfiedAtMs (closed/resolved). */
  satisfied: boolean;
};

export function slaWindowHours(priority: string): number {
  return SLA_RESPONSE_HOURS[priority] ?? DEFAULT_WINDOW_HOURS;
}

/**
 * Assess one ticket against its SLA window. The clock runs from createdAtMs
 * to satisfiedAtMs when present (closed/resolved tickets keep the state they
 * finished with), otherwise to nowMs.
 */
export function slaAssess(input: {
  createdAtMs: number;
  satisfiedAtMs?: number | null;
  priority: string;
  nowMs: number;
}): SlaAssessment {
  const windowHours = slaWindowHours(input.priority);
  const endMs = input.satisfiedAtMs ?? input.nowMs;
  const elapsedHours = Math.max(0, (endMs - input.createdAtMs) / 3_600_000);
  const pct = windowHours > 0 ? Math.round((elapsedHours / windowHours) * 100) : 0;
  const state: SlaState = pct >= 100 ? "breach" : pct >= RISK_THRESHOLD_PCT ? "risk" : "ok";
  return {
    state,
    pct,
    hoursOver: pct >= 100 ? Math.round(elapsedHours - windowHours) : null,
    windowHours,
    satisfied: input.satisfiedAtMs != null
  };
}

/** Short UI label, e.g. "42% SLA" / "+3h over" / "met". */
export function slaLabel(a: SlaAssessment): string {
  if (a.satisfied && a.state !== "breach") return "met";
  if (a.state === "breach") return `+${a.hoursOver}h over`;
  return `${a.pct}% SLA`;
}

/** Pill modifier for an SLA state ("green" | "amber" | "red"). */
export function slaPill(state: SlaState): string {
  return state === "breach" ? "red" : state === "risk" ? "amber" : "green";
}
