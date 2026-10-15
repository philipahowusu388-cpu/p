// ============================================================
// NOTIFICATIONS
// Local notifications for period and pill reminders.
// Works fully in the dev build and production build.
// ============================================================

import * as Notifications from "expo-notifications";
import type { PeriodEntry, Contraceptive, ContraceptiveLog } from "../types";
import { computePredictions } from "./domain/predictions";
import { isDoseDay, doseTimeOn } from "./domain/pills";
import { addDays, startOfDay, toISO } from "./utils/dates";

// ------------------------------------------------------------
// Availability
// ------------------------------------------------------------

/**
 * Notifications are always available in a real build.
 * Kept for API compatibility with existing callers.
 */
export function isNotificationsAvailable(): boolean {
  return true;
}

// ------------------------------------------------------------
// State shape
// ------------------------------------------------------------

export interface NotificationState {
  entries: PeriodEntry[];
  contraceptives: Contraceptive[];
  contraceptiveLog: ContraceptiveLog;
  notifPeriod: boolean;
  notifLog: boolean;
  notifPill: boolean;
}

// ------------------------------------------------------------
// Cancel
// ------------------------------------------------------------

export async function cancelAllNotifications(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------
// Schedule
// ------------------------------------------------------------

const MAX_SCHEDULED = 60;

export async function scheduleAllNotifications(
  state: NotificationState,
): Promise<void> {
  const pending: Array<{
    content: { title: string; body: string };
    trigger: { date: Date };
  }> = [];

  const now = new Date();

  if (state.notifPeriod) {
    const predictions = computePredictions(state.entries);
    if (predictions) {
      for (let i = 0; i < 3; i++) {
        const cycleStart = addDays(
          predictions.nextStart,
          i * predictions.cycle,
        );
        const remindAt = startOfDay(addDays(cycleStart, -1));
        remindAt.setHours(9, 0, 0, 0);

        if (remindAt > now) {
          pending.push({
            content: {
              title: "🌸 Period reminder",
              body: "Your period is predicted to start tomorrow.",
            },
            trigger: { date: remindAt },
          });
        }
      }
    }
  }

  if (state.notifLog) {
    const predictions = computePredictions(state.entries);
    if (predictions) {
      const nudgeAt = startOfDay(addDays(predictions.nextStart, 3));
      nudgeAt.setHours(9, 0, 0, 0);
      if (nudgeAt > now) {
        pending.push({
          content: {
            title: "📝 Time to log?",
            body: "Your period was predicted to start 3 days ago. Log it?",
          },
          trigger: { date: nudgeAt },
        });
      }
    }
  }

  if (state.notifPill) {
    const today = startOfDay(now);
    for (let d = 0; d < 30; d++) {
      const day = addDays(today, d);
      for (const c of state.contraceptives) {
        if (!c.active) continue;
        if (!isDoseDay(c, day)) continue;

        const dueAt = doseTimeOn(c, day);
        if (dueAt <= now) continue;

        const iso = toISO(day);
        const logged = state.contraceptiveLog[iso]?.[c.id];
        if (logged) continue;

        pending.push({
          content: {
            title: `💊 ${c.name}`,
            body: "Time to take your dose.",
          },
          trigger: { date: dueAt },
        });
      }
    }
  }

  pending.sort((a, b) => a.trigger.date.getTime() - b.trigger.date.getTime());
  const toSchedule = pending.slice(0, MAX_SCHEDULED);

  for (const req of toSchedule) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: req.content,
        trigger: { date: req.trigger.date },
      });
    } catch {
      // ignore individual failures
    }
  }
}

// ------------------------------------------------------------
// Handler
// ------------------------------------------------------------

export function configureNotificationHandler(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------
// Permission
// ------------------------------------------------------------

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    if (!settings.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}
