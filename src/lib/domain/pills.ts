// ============================================================
// PILLS / CONTRACEPTIVES
// Schedule logic, dose state, per-day logging.
// Pure functions — no React, no storage.
// ============================================================

import type {
  Contraceptive,
  ContraceptiveLog,
  DoseState,
} from "../../types";
import {
  parseDate,
  toISO,
  startOfDay,
  sameDay,
  timeOn,
} from "../utils/dates";

// ============================================================
// CONSTANTS
// ============================================================

/** How long after the scheduled time a dose counts as "late" instead of "missed". */
export const PILL_LATE_GRACE_HOURS = 6;

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DAY_NAMES_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

// ============================================================
// DOSE DAY / TIME
// ============================================================

/**
 * Does the given contraceptive have a scheduled dose on `date`?
 * Returns false if:
 *   - The contraceptive is inactive
 *   - `date` is before `startedAt`
 *   - The schedule type doesn't include `date`'s day of week
 */
export function isDoseDay(c: Contraceptive, date: Date): boolean {
  if (!c.active) return false;
  if (date < parseDate(c.startedAt)) return false;

  const dow = date.getDay();

  switch (c.schedule.type) {
    case "daily":
      return true;
    case "weekly":
      return dow === c.schedule.days[0];
    case "custom":
      return c.schedule.days.includes(dow);
    default:
      return false;
  }
}

/**
 * Return the exact Date when the dose is due on `date`.
 * Example: schedule time "21:00", date Oct 9 2026 → Oct 9 2026 21:00:00.000
 */
export function doseTimeOn(c: Contraceptive, date: Date): Date {
  return timeOn(date, c.schedule.time);
}

// ============================================================
// DOSE STATE
// ============================================================

export type ExtendedDoseState = DoseState | "due" | "late" | "missed" | "notdue";

/**
 * Determine the current state of a dose on a given date.
 *
 *   - "taken"    : user marked it as taken
 *   - "skipped"  : user marked it as skipped
 *   - "notdue"   : not a scheduled dose day, or the day is still in the future
 *   - "due"      : today, scheduled, and not yet at the scheduled time
 *   - "late"     : today, scheduled, past scheduled time but within grace hours
 *   - "missed"   : past scheduled time + grace, and not logged
 *
 * `now` can be passed for testability. Defaults to the current time.
 */
export function doseState(
  c: Contraceptive,
  date: Date,
  log: ContraceptiveLog,
  now: Date = new Date()
): ExtendedDoseState {
  const iso = toISO(date);
  const logged = log[iso]?.[c.id];

  if (logged === "taken") return "taken";
  if (logged === "skipped") return "skipped";

  if (!isDoseDay(c, date)) return "notdue";

  const dueAt = doseTimeOn(c, date);
  const isToday = sameDay(date, now);

  if (isToday) {
    if (now < dueAt) return "due";
    const hoursLate = (now.getTime() - dueAt.getTime()) / (1000 * 60 * 60);
    if (hoursLate < PILL_LATE_GRACE_HOURS) return "late";
    return "missed";
  }

  // Past day
  if (date < startOfDay(now)) return "missed";

  // Future day
  return "notdue";
}

/**
 * Human-readable label for a dose state.
 */
export function doseStateLabel(state: ExtendedDoseState): string {
  switch (state) {
    case "taken":
      return "Taken";
    case "skipped":
      return "Skipped";
    case "late":
      return "Late";
    case "missed":
      return "Missed";
    case "due":
      return "Due";
    case "notdue":
      return "";
  }
}

// ============================================================
// TODAY'S DOSES
// ============================================================

export interface TodayDose {
  contraceptive: Contraceptive;
  state: ExtendedDoseState;
  /** When the dose is due today */
  dueAt: Date;
}

/**
 * Return every active contraceptive that has a dose scheduled for today,
 * with its current state. Sorted by scheduled time.
 */
export function todayDoses(
  contraceptives: Contraceptive[],
  log: ContraceptiveLog,
  now: Date = new Date()
): TodayDose[] {
  const today = startOfDay(now);

  return contraceptives
    .filter((c) => c.active && isDoseDay(c, today))
    .map((c) => ({
      contraceptive: c,
      state: doseState(c, today, log, now),
      dueAt: doseTimeOn(c, today),
    }))
    .sort((a, b) =>
      a.contraceptive.schedule.time.localeCompare(b.contraceptive.schedule.time)
    );
}

// ============================================================
// LOGGING
// ============================================================

/**
 * Set or clear the log entry for a specific contraceptive on a specific day.
 *
 *   setDose(log, id, date, "taken")   → marks as taken
 *   setDose(log, id, date, "skipped") → marks as skipped
 *   setDose(log, id, date, null)      → clears the entry (undo)
 *
 * Returns a NEW log object. Does not mutate the input.
 */
export function setDose(
  log: ContraceptiveLog,
  contraceptiveId: string,
  date: Date,
  value: DoseState | null
): ContraceptiveLog {
  const iso = toISO(date);
  const next: ContraceptiveLog = { ...log };

  if (value === null) {
    // Clear this contraceptive's entry for the day
    if (next[iso]) {
      const dayCopy = { ...next[iso] };
      delete dayCopy[contraceptiveId];
      if (Object.keys(dayCopy).length === 0) {
        delete next[iso];
      } else {
        next[iso] = dayCopy;
      }
    }
    return next;
  }

  // Set the entry
  next[iso] = { ...(next[iso] ?? {}), [contraceptiveId]: value };
  return next;
}

// ============================================================
// SCHEDULE FORMATTING
// ============================================================

/**
 * Human-readable description of a contraceptive schedule.
 * Examples:
 *   "Every day at 9:00 PM"
 *   "Every Monday at 9:00 PM"
 *   "Mon, Wed, Fri at 9:00 PM"
 */
export function formatDoseSchedule(c: Contraceptive): string {
  const t = c.schedule.time;
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  switch (c.schedule.type) {
    case "daily":
      return `Every day at ${time}`;
    case "weekly":
      return `Every ${DAY_NAMES_LONG[c.schedule.days[0]]} at ${time}`;
    case "custom": {
      const days = [...c.schedule.days]
        .sort((a, b) => a - b)
        .map((i) => DAY_NAMES[i])
        .join(", ");
      return `${days} at ${time}`;
    }
  }
}

// ============================================================
// ID GENERATION
// ============================================================

/**
 * Generate a unique ID for a new contraceptive.
 */
export function newContraceptiveId(): string {
  return `c_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}