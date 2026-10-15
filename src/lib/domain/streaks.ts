// ============================================================
// STREAKS & MILESTONES
// Counts consecutive days with any logged activity.
// Pure functions — no React, no storage.
// ============================================================

import type {
  PeriodEntry,
  DayNotesMap,
  Streaks,
  Milestone,
} from "../../types";
import {
  parseDate,
  toISO,
  addDays,
  startOfDay,
  daysBetween,
} from "../utils/dates";

// ============================================================
// MILESTONES
// ============================================================

export const MILESTONES: Omit<Milestone, "earned">[] = [
  { days: 7, label: "7 days", emoji: "🌱" },
  { days: 30, label: "30 days", emoji: "🌿" },
  { days: 100, label: "100 days", emoji: "🌳" },
  { days: 365, label: "1 year", emoji: "🏆" },
];

// ============================================================
// LOGGED DAYS
// ============================================================

/**
 * Does a day note contain any meaningful content?
 * An empty `{ note: "", flow: null, ... }` record doesn't count.
 */
function hasContent(rec: DayNotesMap[string] | undefined): boolean {
  if (!rec) return false;
  return Boolean(
    rec.note ||
      rec.flow ||
      rec.bbt != null ||
      rec.mood ||
      rec.energy ||
      rec.water != null
  );
}

/**
 * Return the set of ISO date strings on which the user has logged
 * *something* — a period entry (any day within it) or a day note.
 */
export function getAllLoggedDays(
  entries: PeriodEntry[],
  dayNotes: DayNotesMap
): Set<string> {
  const days = new Set<string>();

  // Every day covered by a period entry
  for (const e of entries) {
    const start = parseDate(e.startDate);
    const end = e.endDate ? parseDate(e.endDate) : start;
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      days.add(toISO(d));
    }
  }

  // Every day with a non-empty note
  for (const [iso, rec] of Object.entries(dayNotes)) {
    if (hasContent(rec)) days.add(iso);
  }

  return days;
}

// ============================================================
// STREAKS
// ============================================================

/**
 * Compute the current and best logging streaks.
 *
 * "Current" counts backward from today (or yesterday, if today has no log yet).
 * "Best" is the longest run of consecutive days in the entire history.
 */
export function computeStreaks(
  entries: PeriodEntry[],
  dayNotes: DayNotesMap,
  now: Date = new Date()
): Streaks {
  const days = getAllLoggedDays(entries, dayNotes);
  if (days.size === 0) return { current: 0, best: 0 };

  const sortedDays = [...days].sort();
  const today = startOfDay(now);
  const todayIso = toISO(today);
  const yesterdayIso = toISO(addDays(today, -1));

  // ---- Current streak ----
  let current = 0;
  let cursor: Date | null = null;
  if (days.has(todayIso)) cursor = today;
  else if (days.has(yesterdayIso)) cursor = addDays(today, -1);

  if (cursor) {
    let d = new Date(cursor);
    while (days.has(toISO(d))) {
      current++;
      d = addDays(d, -1);
    }
  }

  // ---- Best streak (longest consecutive run) ----
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const iso of sortedDays) {
    const d = parseDate(iso);
    if (prev && daysBetween(prev, d) === 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = d;
  }

  if (current > best) best = current;

  return { current, best };
}

// ============================================================
// MILESTONES
// ============================================================

/**
 * Attach an `earned` flag to each milestone based on the given streak.
 * Pass `best` to show all-time achieved milestones, or `current` for active streak.
 */
export function computeMilestones(streak: number): Milestone[] {
  return MILESTONES.map((m) => ({
    ...m,
    earned: streak >= m.days,
  }));
}