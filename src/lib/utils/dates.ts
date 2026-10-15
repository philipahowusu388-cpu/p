// ============================================================
// DATE HELPERS
// All dates are handled as local-time Date objects.
// ISO strings are always "YYYY-MM-DD" (no time, no timezone).
// ============================================================

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Parse an ISO date string ("YYYY-MM-DD") into a local-midnight Date.
 * Avoids `new Date("2026-10-09")` which parses as UTC and can shift
 * the day in negative timezones.
 */
export function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format a Date as "YYYY-MM-DD" in local time.
 */
export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Human-readable date, e.g. "Oct 9, 2026".
 * Uses the device locale.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Whole days between two dates. Always rounds toward the closest day.
 * `daysBetween(a, b)` returns a positive number if `b` is after `a`.
 */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/**
 * Return a new Date `days` after `date`. Negative `days` moves backwards.
 * Does not mutate `date`.
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * True if both dates fall on the same calendar day (local time).
 */
export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Return a copy of `date` at local midnight (00:00:00.000).
 */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Today at local midnight.
 */
export function today(): Date {
  return startOfDay(new Date());
}

/**
 * "HH:MM" -> { hours, minutes }.
 */
export function parseTime(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

/**
 * Return a Date object representing `hhmm` on the same calendar day as `date`.
 */
export function timeOn(date: Date, hhmm: string): Date {
  const { hours, minutes } = parseTime(hhmm);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}
