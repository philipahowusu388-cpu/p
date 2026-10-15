import type { PeriodEntry, Profile } from "../types";
import { computePredictions } from "./domain/predictions";
import { formatDate } from "./utils/dates";

export interface ShareTexts {
  compact: string;
  friendly: string;
}

export function buildShareTexts(
  entries: PeriodEntry[],
  profile: Profile | null,
): ShareTexts {
  const predictions = computePredictions(entries);
  const name = profile?.name ?? "";

  if (!predictions) {
    return {
      compact: `${name ? name + " — " : ""}No periods logged yet.`,
      friendly: `Hi! I haven't logged any periods yet, so there's nothing to share.`,
    };
  }

  const nextStart = formatDate(predictions.nextStart);
  const nextEnd = formatDate(predictions.nextEnd);
  const fertileStart = formatDate(predictions.fertileStart);
  const fertileEnd = formatDate(predictions.fertileEnd);
  const ovu = formatDate(predictions.ovulation);

  const compact =
    `${name ? name + " — " : ""}Next period: ${nextStart}–${nextEnd} · ` +
    `Ovulation: ${ovu} · Fertile: ${fertileStart}–${fertileEnd}`;

  const friendly =
    `${name ? name + "'s cycle info:\n" : "Cycle info:\n"}` +
    `• Next period expected: ${nextStart} – ${nextEnd}\n` +
    `• Estimated ovulation: ${ovu}\n` +
    `• Fertile window: ${fertileStart} – ${fertileEnd}\n\n` +
    `These are estimates based on tracked data — not medical advice.`;

  return { compact, friendly };
}
