// ============================================================
// INSIGHTS
// Pattern detection across period entries, day notes, and streaks.
// Pure functions — no React, no storage.
// ============================================================

import type {
  PeriodEntry,
  DayNotesMap,
  Insight,
  MoodLevel,
  EnergyLevel,
} from "../../types";
import {
  getSortedEntries,
  averageCycleLength,
  averagePeriodLength,
  computeConfidence,
} from "./predictions";
import { computeStreaks } from "./streaks";
import { parseDate, toISO, addDays, daysBetween } from "../utils/dates";

// ============================================================
// SCORE TABLES
// ============================================================

const MOOD_SCORE: Record<MoodLevel, number> = {
  awful: 1,
  meh: 2,
  good: 3,
  great: 4,
};

const MOOD_EMOJI: Record<MoodLevel, string> = {
  awful: "😞",
  meh: "😐",
  good: "🙂",
  great: "😄",
};

const ENERGY_SCORE: Record<EnergyLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Build a set of every ISO date covered by a period entry.
 * Used to check "was this day a period day?"
 */
function buildPeriodIsoSet(sorted: PeriodEntry[]): Set<string> {
  const set = new Set<string>();
  const avgLen = averagePeriodLength(sorted);
  for (const e of sorted) {
    const start = parseDate(e.startDate);
    const end = e.endDate ? parseDate(e.endDate) : addDays(start, avgLen - 1);
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      set.add(toISO(d));
    }
  }
  return set;
}

/**
 * Escape HTML special characters. Insights may contain user-provided
 * symptom names, which end up in `<strong>` tags in the UI.
 *
 * Even though React Native `<Text>` doesn't parse HTML, we keep this
 * for consistency with the web version and to make the intent explicit.
 */
function escapeText(str: string): string {
  return String(str).replace(/[<>&]/g, (c) => {
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    return "&amp;";
  });
}

// ============================================================
// MAIN
// ============================================================

/**
 * Compute the list of insights shown on the Log tab.
 * Returns at most 5 insights, ordered by importance.
 *
 * Each insight has an `icon` (emoji) and `text` (which may contain
 * `<strong>` markup for emphasis — the UI renders this as nested Text).
 */
export function computeInsights(
  entries: PeriodEntry[],
  dayNotes: DayNotesMap
): Insight[] {
  const insights: Insight[] = [];
  const sorted = getSortedEntries(entries);

  // Not enough data for anything meaningful
  if (sorted.length < 2) return insights;

  // ----------------------------------------------------------
  // 1. Top symptom on period days
  // ----------------------------------------------------------
  const symptomCounts: Record<string, number> = {};
  for (const e of entries) {
    for (const s of e.symptoms ?? []) {
      symptomCounts[s] = (symptomCounts[s] ?? 0) + 1;
    }
  }
  const topSymptomEntry = Object.entries(symptomCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (topSymptomEntry && topSymptomEntry[1] >= 2) {
    const [name, count] = topSymptomEntry;
    const pct = Math.round((count / entries.length) * 100);
    insights.push({
      icon: "🔁",
      text: `<strong>${escapeText(name)}</strong> shows up on ${pct}% of your logged periods.`,
    });
  }

  // ----------------------------------------------------------
  // 2. Most common mood on period days
  // ----------------------------------------------------------
  const periodIsoSet = buildPeriodIsoSet(sorted);
  const moodOnPeriod: Record<string, number> = {};
  for (const [iso, rec] of Object.entries(dayNotes)) {
    if (!rec || !rec.mood) continue;
    if (!periodIsoSet.has(iso)) continue;
    moodOnPeriod[rec.mood] = (moodOnPeriod[rec.mood] ?? 0) + 1;
  }
  const topMoodEntry = Object.entries(moodOnPeriod).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (topMoodEntry && topMoodEntry[1] >= 2) {
    const mood = topMoodEntry[0] as MoodLevel;
    const emoji = MOOD_EMOJI[mood] ?? "";
    insights.push({
      icon: "💭",
      text: `On period days you most often feel <strong>${mood}</strong> ${emoji}.`,
    });
  }

  // ----------------------------------------------------------
  // 3. Energy dip on a specific cycle day
  // ----------------------------------------------------------
  const energyByCycleDay: Record<number, number[]> = {};
  for (const e of sorted) {
    const start = parseDate(e.startDate);
    for (const [iso, rec] of Object.entries(dayNotes)) {
      if (!rec || !rec.energy) continue;
      const d = parseDate(iso);
      const cycleDay = daysBetween(start, d) + 1;
      if (cycleDay < 1 || cycleDay > 40) continue;
      if (!energyByCycleDay[cycleDay]) energyByCycleDay[cycleDay] = [];
      energyByCycleDay[cycleDay].push(ENERGY_SCORE[rec.energy] ?? 0);
    }
  }
  const energyAverages = Object.entries(energyByCycleDay)
    .map(([day, arr]) => ({
      day: Number(day),
      avg: arr.reduce((a, b) => a + b, 0) / arr.length,
    }))
    .filter((x) => x.avg > 0);

  if (energyAverages.length >= 3) {
    const lowest = energyAverages.reduce(
      (m, x) => (x.avg < m.avg ? x : m),
      energyAverages[0]
    );
    if (lowest.avg < 2) {
      insights.push({
        icon: "🔋",
        text: `Your energy tends to dip on <strong>day ${lowest.day}</strong> of your cycle.`,
      });
    }
  }

  // ----------------------------------------------------------
  // 4. Last cycle vs average
  // ----------------------------------------------------------
  if (sorted.length >= 3) {
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const lastCycle = daysBetween(
      parseDate(prev.startDate),
      parseDate(last.startDate)
    );
    const avg = averageCycleLength(sorted);
    const diff = lastCycle - avg;
    if (Math.abs(diff) >= 3) {
      const plural = Math.abs(diff) === 1 ? "" : "s";
      insights.push({
        icon: diff > 0 ? "📈" : "📉",
        text: `Your last cycle was <strong>${Math.abs(diff)} day${plural} ${
          diff > 0 ? "longer" : "shorter"
        }</strong> than your average.`,
      });
    }
  }

  // ----------------------------------------------------------
  // 5. Logging streak celebration
  // ----------------------------------------------------------
  const { current } = computeStreaks(entries, dayNotes);
  if (current >= 3) {
    insights.push({
      icon: "🔥",
      text: `You're on a <strong>${current}-day</strong> logging streak. Keep going!`,
    });
  }

  // ----------------------------------------------------------
  // 6. Prediction confidence hint
  // ----------------------------------------------------------
  const confidence = computeConfidence(sorted);
  if (confidence.label === "low" && sorted.length >= 2) {
    insights.push({
      icon: "📊",
      text: `Your predictions will get more accurate as you log more cycles.`,
    });
  }

  return insights.slice(0, 5);
}