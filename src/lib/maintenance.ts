/**
 * Maintenance / CMMS pure helpers. No DB, no surprises — frequency math,
 * status vocabularies, and small formatters shared by the maintenance pages,
 * API routes, and dashboard.
 */

export const PM_FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "annual"] as const;
export type PmFrequency = (typeof PM_FREQUENCIES)[number];

export const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  annual: 365
};

/** Roll a due date forward by one cycle of the given frequency. */
export function advanceDueDate(from: Date, frequency: string): Date {
  const days = FREQUENCY_DAYS[frequency] ?? 30;
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}

export const MACHINE_STATUSES = ["running", "down", "pm", "idle", "moving"] as const;
export type MachineStatus = (typeof MACHINE_STATUSES)[number];

export function machineStatusLabel(status: string): string {
  return (
    { running: "Running", down: "DOWN", pm: "In PM", idle: "Idle", moving: "Moving" }[status] ??
    status
  );
}

/** Pill color modifier ("green" | "amber" | "red" | "") for a machine status. */
export function machineStatusPill(status: string): string {
  if (status === "down") return "red";
  if (status === "pm") return "amber";
  if (status === "running") return "green";
  return "";
}

export const WO_STATUSES = ["REQUESTED", "ASSIGNED", "IN_PROGRESS", "DONE"] as const;
export type WorkOrderStatus = (typeof WO_STATUSES)[number];

export function woStatusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export function woStatusPill(status: string): string {
  if (status === "DONE") return "green";
  if (status === "IN_PROGRESS") return "amber";
  return "";
}

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
}

/** Whole days from now until `d` (negative when overdue). null when no date. */
export function daysUntil(d: Date | null | undefined, now: Date = new Date()): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

/** Bucket a PM by how soon it is due, for the schedule grouping. */
export function pmDueBucket(d: Date | null | undefined, now: Date = new Date()): "overdue" | "today" | "week" | "later" | "none" {
  const days = daysUntil(d, now);
  if (days === null) return "none";
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "week";
  return "later";
}
