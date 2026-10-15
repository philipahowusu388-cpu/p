// ============================================================
// CYCLE PHASES
// Classifies "what phase am I in today?"
// Pure functions — no React, no storage.
// ============================================================

import type { PeriodEntry, CyclePhase } from "../../types";
import {
  getSortedEntries,
  averagePeriodLength,
  computePredictions,
} from "./predictions";
import {
  parseDate,
  addDays,
  startOfDay,
  daysBetween,
} from "../utils/dates";

// ============================================================
// MAIN PHASE
// ============================================================

/**
 * Determine which phase of the menstrual cycle the given date falls into.
 *
 * Returns null if there is no data to base predictions on.
 *
 * The four phases:
 *   - menstrual:  from last period start through last period end
 *   - follicular: from day after period ends until 2 days before ovulation
 *   - ovulation:  3-day window centered on ovulation
 *   - luteal:     from 2 days after ovulation until day before next period
 *
 * NOTE: This is the fixed version. The web app used the *next* cycle's
 * ovulation to classify *today*, which is wrong for most of the month.
 */
export function computePhase(
  entries: PeriodEntry[],
  date: Date = new Date()
): CyclePhase | null {
  const predictions = computePredictions(entries);
  if (!predictions) return null;

  const sorted = getSortedEntries(entries);
  const last = sorted[sorted.length - 1];
  const lastStart = parseDate(last.startDate);
  const lastEnd = last.endDate
    ? parseDate(last.endDate)
    : addDays(lastStart, averagePeriodLength(sorted) - 1);

  const today = startOfDay(date);

  // --- 1. Menstrual: today is within the last logged period ---
  if (today >= lastStart && today <= lastEnd) {
    return {
      phase: "menstrual",
      label: "Menstrual phase",
      emoji: "🌑",
      desc: "Rest, warmth, and gentle movement. Your body is doing hard work.",
      cls: "phase-menstrual",
    };
  }

  // --- 2. Ovulation: 3-day window around the CURRENT cycle's ovulation ---
  //
  // The current cycle runs from lastStart to (lastStart + cycle).
  // Ovulation in the current cycle = lastStart + cycle - 14.
  // (Predictions.ovulation is NEXT cycle's ovulation — not what we want here.)
  const currentOvulation = addDays(lastStart, predictions.cycle - 14);
  const ovuStart = addDays(currentOvulation, -1);
  const ovuEnd = addDays(currentOvulation, 1);
  if (today >= ovuStart && today <= ovuEnd) {
    return {
      phase: "ovulation",
      label: "Ovulation window",
      emoji: "🌕",
      desc: "Peak energy and fertility. A good day for big things if you feel like it.",
      cls: "phase-ovulation",
    };
  }

  // --- 3. Follicular: from day after last period ends to 2 days before ovulation ---
  const follicularStart = addDays(lastEnd, 1);
  const follicularEnd = addDays(currentOvulation, -2);
  if (today >= follicularStart && today <= follicularEnd) {
    return {
      phase: "follicular",
      label: "Follicular phase",
      emoji: "🌒",
      desc: "Energy is rising. A good time to start projects or move more.",
      cls: "phase-follicular",
    };
  }

  // --- 4. Luteal: 2 days after ovulation until day before next period ---
  const lutealStart = addDays(currentOvulation, 2);
  const lutealEnd = addDays(lastStart, predictions.cycle - 1);
  if (today >= lutealStart && today <= lutealEnd) {
    return {
      phase: "luteal",
      label: "Luteal phase",
      emoji: "🌘",
      desc: "Wind-down time. Cravings, mood shifts, and low energy are normal.",
      cls: "phase-luteal",
    };
  }

  // --- 5. Fallback: today is past the expected cycle start but no new period logged ---
  // We don't know what phase this is. Return luteal (the safest guess) or null.
  if (today > lutealEnd) {
    return {
      phase: "luteal",
      label: "Late luteal phase",
      emoji: "🌘",
      desc: "Your period may be late. Consider logging a new entry.",
      cls: "phase-luteal",
    };
  }

  return null;
}

// ============================================================
// CYCLE DAY
// ============================================================

/**
 * Return which day of the current cycle today is (1-indexed).
 * Day 1 = first day of the most recent logged period.
 * Returns null if there's no data.
 *
 * Useful for charts, insights ("your energy dips on day 22").
 */
export function getCycleDay(
  entries: PeriodEntry[],
  date: Date = new Date()
): number | null {
  const sorted = getSortedEntries(entries);
  if (sorted.length === 0) return null;

  const last = sorted[sorted.length - 1];
  const lastStart = parseDate(last.startDate);
  const today = startOfDay(date);

  const diff = daysBetween(lastStart, today);
  if (diff < 0) return null; // today is before the last logged period

  return diff + 1; // 1-indexed
}