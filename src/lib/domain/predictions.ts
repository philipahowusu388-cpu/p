// ============================================================
// PREDICTIONS
// Pure functions — no React, no storage, no side effects.
// ============================================================

import type {
  PeriodEntry,
  Predictions,
  Confidence,
} from "../../types";
import {
  parseDate,
  daysBetween,
  addDays,
  startOfDay,
} from "../utils/dates";

// ============================================================
// DEFAULTS
// ============================================================

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;

/** Valid cycle lengths (filter out data entry mistakes). */
const MIN_CYCLE_DAYS = 15;
const MAX_CYCLE_DAYS = 60;

/** Valid period lengths. */
const MIN_PERIOD_DAYS = 1;
const MAX_PERIOD_DAYS = 15;

// ============================================================
// SORTING
// ============================================================

/**
 * Return a copy of entries sorted oldest-first by startDate.
 * Does not mutate the input.
 */
export function getSortedEntries(entries: PeriodEntry[]): PeriodEntry[] {
  return [...entries].sort(
    (a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime()
  );
}

// ============================================================
// AVERAGES
// ============================================================

/**
 * Average cycle length in days, from start-to-start intervals.
 * Returns 28 if there is not enough data.
 */
export function averageCycleLength(sorted: PeriodEntry[]): number {
  if (sorted.length < 2) return DEFAULT_CYCLE_LENGTH;
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const g = daysBetween(
      parseDate(sorted[i - 1].startDate),
      parseDate(sorted[i].startDate)
    );
    if (g > MIN_CYCLE_DAYS && g < MAX_CYCLE_DAYS) gaps.push(g);
  }
  if (gaps.length === 0) return DEFAULT_CYCLE_LENGTH;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

/**
 * Average period length in days, from start-to-end for entries that have an end.
 * Returns 5 if there is not enough data.
 */
export function averagePeriodLength(sorted: PeriodEntry[]): number {
  const withEnd = sorted.filter((e) => e.endDate);
  if (withEnd.length === 0) return DEFAULT_PERIOD_LENGTH;
  const lengths = withEnd.map(
    (e) => daysBetween(parseDate(e.startDate), parseDate(e.endDate!)) + 1
  );
  const valid = lengths.filter((l) => l >= MIN_PERIOD_DAYS && l <= MAX_PERIOD_DAYS);
  if (valid.length === 0) return DEFAULT_PERIOD_LENGTH;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

// ============================================================
// SPREAD / CONFIDENCE
// ============================================================

/**
 * Standard deviation of cycle gaps.
 * `n` is the number of valid gaps used.
 */
export function cycleSpread(sorted: PeriodEntry[]): {
  sd: number | null;
  n: number;
} {
  if (sorted.length < 2) return { sd: null, n: 0 };
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const g = daysBetween(
      parseDate(sorted[i - 1].startDate),
      parseDate(sorted[i].startDate)
    );
    if (g > MIN_CYCLE_DAYS && g < MAX_CYCLE_DAYS) gaps.push(g);
  }
  if (gaps.length < 1) return { sd: null, n: gaps.length };
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance =
    gaps.reduce((acc, g) => acc + (g - mean) ** 2, 0) / gaps.length;
  return { sd: Math.sqrt(variance), n: gaps.length };
}

/**
 * Confidence score (0–100) based on how much data we have and how
 * regular the cycles are. Higher = more reliable predictions.
 */
export function computeConfidence(sorted: PeriodEntry[]): Confidence {
  const { sd, n } = cycleSpread(sorted);
  if (n < 1) return { score: 25, label: "low", rangeDays: 4 };

  // Base score: more gaps = more confidence
  let score = 50 + Math.min(30, n * 6);

  // Penalize high variability
  if (sd !== null) score -= Math.min(40, Math.round(sd * 12));

  score = Math.max(20, Math.min(95, score));

  const rangeDays = score >= 80 ? 1 : score >= 60 ? 2 : 3;
  const label: Confidence["label"] =
    score >= 80 ? "high" : score >= 55 ? "medium" : "low";

  return { score, label, rangeDays };
}

// ============================================================
// MAIN PREDICTIONS
// ============================================================

/**
 * Compute predictions from the raw entries list.
 * Returns null if there are no entries.
 *
 * NOTE: `nextStart`, `ovulation`, etc. are returned as Date objects
 * at local midnight. Callers should format them with `formatDate`.
 */
export function computePredictions(entries: PeriodEntry[]): Predictions | null {
  const sorted = getSortedEntries(entries);
  if (sorted.length === 0) return null;

  const last = sorted[sorted.length - 1];
  const lastStart = parseDate(last.startDate);
  const cycle = averageCycleLength(sorted);
  const periodLen = averagePeriodLength(sorted);

  const nextStart = addDays(lastStart, cycle);
  const nextEnd = addDays(nextStart, periodLen - 1);

  // Ovulation: ~14 days before the next period starts.
  // (Luteal phase length is more consistent than follicular, which is why
  // we count backward from the *next* start, not forward from the last.)
  const ovulation = addDays(nextStart, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);

  const confidence = computeConfidence(sorted);
  const rangeDays = confidence.rangeDays;
  const nextStartEarly = addDays(nextStart, -rangeDays);
  const nextStartLate = addDays(nextStart, +rangeDays);

  return {
    cycle,
    periodLen,
    nextStart: startOfDay(nextStart),
    nextEnd: startOfDay(nextEnd),
    nextStartEarly: startOfDay(nextStartEarly),
    nextStartLate: startOfDay(nextStartLate),
    ovulation: startOfDay(ovulation),
    fertileStart: startOfDay(fertileStart),
    fertileEnd: startOfDay(fertileEnd),
    confidence,
  };
}

// ============================================================
// REGULARITY INSIGHT
// ============================================================

/**
 * Human-readable description of how regular the user's cycles are.
 */
export function getRegularityInsight(entries: PeriodEntry[]): {
  label: string;
  cls: "regular" | "somewhat" | "irregular" | "unknown";
} {
  const sorted = getSortedEntries(entries);
  if (sorted.length < 3) return { label: "Not enough data yet", cls: "unknown" };

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const g = daysBetween(
      parseDate(sorted[i - 1].startDate),
      parseDate(sorted[i].startDate)
    );
    if (g > MIN_CYCLE_DAYS && g < MAX_CYCLE_DAYS) gaps.push(g);
  }
  if (gaps.length < 2) return { label: "Not enough data yet", cls: "unknown" };

  const spread = Math.max(...gaps) - Math.min(...gaps);
  if (spread <= 4) return { label: "Regular cycle", cls: "regular" };
  if (spread <= 8) return { label: "Somewhat irregular", cls: "somewhat" };
  return { label: "Irregular cycle", cls: "irregular" };
}