import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View, Text } from "react-native";
import { useAppStore } from "../../lib/store";
import { computePredictions } from "../../lib/domain/predictions";
import { computePhase } from "../../lib/domain/phases";
import { computeStreaks, computeMilestones } from "../../lib/domain/streaks";
import { parseDate, daysBetween, today } from "../../lib/utils/dates";
import { CountdownRing } from "../../components/CountdownRing";
import { PhaseBanner } from "../../components/PhaseBanner";
import { StreakCard } from "../../components/StreakCard";
import { LogPeriodForm } from "../../components/LogPeriodForm";
import { PredictionsPanel } from "../../components/PredictionsPanel";
import { HistoryList } from "../../components/HistoryList";
import { loadProfiles, findProfile } from "../../lib/profiles";
import type { Profile } from "../../types";
import { useTheme } from "../../lib/theme";

export default function LogScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const entries = useAppStore((s) => s.entries);
  const dayNotes = useAppStore((s) => s.dayNotes);
  const customSymptoms = useAppStore((s) => s.customSymptoms);
  const addEntry = useAppStore((s) => s.addEntry);
  const removeEntry = useAppStore((s) => s.removeEntry);

  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const list = await loadProfiles();
      setProfile(findProfile(list, useAppStore.getState().profileId));
    })();
  }, []);

  const predictions = computePredictions(entries);
  const phase = computePhase(entries);
  const streaks = computeStreaks(entries, dayNotes);
  const milestones = computeMilestones(streaks.best);

  let daysRemaining = 0;
  let progress = 0;
  let overdue = false;

  if (predictions) {
    const now = today();
    daysRemaining = daysBetween(now, predictions.nextStart);
    overdue = daysRemaining < 0;

    const lastEntry = entries.reduce(
      (latest, e) => {
        return !latest || e.startDate > latest.startDate ? e : latest;
      },
      null as (typeof entries)[number] | null,
    );

    if (lastEntry) {
      const lastStart = parseDate(lastEntry.startDate);
      const daysSinceStart = daysBetween(lastStart, now);
      progress = Math.max(0, Math.min(1, daysSinceStart / predictions.cycle));
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {!predictions ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🌸</Text>
          <Text style={styles.emptyTitle}>Welcome</Text>
          <Text style={styles.emptyText}>
            Log your first period to see predictions and insights.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.ringCard}>
            <CountdownRing
              daysRemaining={daysRemaining}
              progress={progress}
              overdue={overdue}
            />
          </View>

          <PhaseBanner phase={phase} />
        </>
      )}

      <StreakCard
        current={streaks.current}
        best={streaks.best}
        milestones={milestones}
      />

      <LogPeriodForm
        customSymptoms={customSymptoms}
        onSubmit={async (entry) => {
          await addEntry(entry);
        }}
      />

      <PredictionsPanel entries={entries} profile={profile} />

      <HistoryList entries={entries} onDelete={(id) => removeEntry(id)} />
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: 16,
      paddingBottom: 48,
      gap: 12,
    },
    ringCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 24,
      alignItems: "center",
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 32,
      alignItems: "center",
      gap: 8,
    },
    emptyIcon: {
      fontSize: 48,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.accentDeep,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
  });
}
