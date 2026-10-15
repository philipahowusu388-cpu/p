import { ScrollView, StyleSheet, View, Text } from "react-native";
import { useAppStore } from "../../lib/store";
import {
  getSortedEntries,
  averageCycleLength,
  averagePeriodLength,
} from "../../lib/domain/predictions";
import { parseDate, daysBetween, formatDate } from "../../lib/utils/dates";
import { LineChart, type ChartPoint } from "../../components/LineChart";
import { useTheme } from "../../lib/theme";
import type { MoodLevel, EnergyLevel } from "../../types";

const MOOD_SCORE: Record<MoodLevel, number> = {
  awful: 1,
  meh: 2,
  good: 3,
  great: 4,
};

const MOOD_LABEL: Record<number, string> = {
  1: "😞",
  2: "😐",
  3: "🙂",
  4: "😄",
};

const ENERGY_SCORE: Record<EnergyLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const ENERGY_LABEL: Record<number, string> = {
  1: "🔋",
  2: "⚡",
  3: "🔥",
};

export default function ChartScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const entries = useAppStore((s) => s.entries);
  const dayNotes = useAppStore((s) => s.dayNotes);
  const bbtUnit = useAppStore((s) => s.bbtUnit);

  const sorted = getSortedEntries(entries);

  const cyclePoints: ChartPoint[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = daysBetween(
      parseDate(sorted[i - 1].startDate),
      parseDate(sorted[i].startDate),
    );
    if (gap > 15 && gap < 60) {
      cyclePoints.push({
        value: gap,
        label: formatDate(parseDate(sorted[i].startDate)),
      });
    }
  }

  const periodPoints: ChartPoint[] = sorted
    .filter((e) => e.endDate)
    .map((e) => ({
      value: daysBetween(parseDate(e.startDate), parseDate(e.endDate!)) + 1,
      label: formatDate(parseDate(e.startDate)),
    }));

  const bbtPoints: ChartPoint[] = Object.entries(dayNotes)
    .filter(([, rec]) => rec && rec.bbt != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, rec]) => {
      const celsius = rec.bbt!;
      const display = bbtUnit === "C" ? celsius : (celsius * 9) / 5 + 32;
      return {
        value: display,
        label: formatDate(parseDate(iso)),
      };
    });

  const moodPoints: ChartPoint[] = Object.entries(dayNotes)
    .filter(([, rec]) => rec && rec.mood)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, rec]) => ({
      value: MOOD_SCORE[rec.mood!],
      label: formatDate(parseDate(iso)),
    }));

  const energyPoints: ChartPoint[] = Object.entries(dayNotes)
    .filter(([, rec]) => rec && rec.energy)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, rec]) => ({
      value: ENERGY_SCORE[rec.energy!],
      label: formatDate(parseDate(iso)),
    }));

  const cycleSummary = cyclePoints.length
    ? `Average: ${averageCycleLength(sorted)} days · Range: ${Math.min(
        ...cyclePoints.map((p) => p.value),
      )}–${Math.max(...cyclePoints.map((p) => p.value))} days`
    : "Log at least two periods to see your cycle trend.";

  const periodSummary = periodPoints.length
    ? `Average: ${averagePeriodLength(sorted)} days · ${periodPoints.length} cycle${
        periodPoints.length === 1 ? "" : "s"
      }`
    : "Log at least one period with an end date.";

  const bbtSummary = bbtPoints.length
    ? `Average: ${(
        bbtPoints.reduce((a, p) => a + p.value, 0) / bbtPoints.length
      ).toFixed(2)} °${bbtUnit} · ${bbtPoints.length} reading${
        bbtPoints.length === 1 ? "" : "s"
      }`
    : "Log a few daily temperatures to see your trend.";

  const moodSummary = moodPoints.length
    ? `Average: ${
        MOOD_LABEL[
          Math.round(
            moodPoints.reduce((a, p) => a + p.value, 0) / moodPoints.length,
          )
        ] ?? "—"
      } · ${moodPoints.length} entr${moodPoints.length === 1 ? "y" : "ies"}`
    : "Log a few days of mood to see your trend.";

  const energySummary = energyPoints.length
    ? `Average: ${
        ENERGY_LABEL[
          Math.round(
            energyPoints.reduce((a, p) => a + p.value, 0) / energyPoints.length,
          )
        ] ?? "—"
      } · ${energyPoints.length} entr${energyPoints.length === 1 ? "y" : "ies"}`
    : "Log a few days of energy to see your trend.";

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ChartCard
        title="Cycle length over time"
        summary={cycleSummary}
        styles={styles}
      >
        <LineChart
          points={cyclePoints}
          color={colors.accent}
          emptyText="Log at least two periods to see your cycle trend."
        />
      </ChartCard>

      <ChartCard
        title="Period length over time"
        summary={periodSummary}
        styles={styles}
      >
        <LineChart
          points={periodPoints}
          color={colors.ovulation}
          emptyText="Add end dates to your periods to see this chart."
        />
      </ChartCard>

      <ChartCard
        title="Basal body temperature"
        summary={bbtSummary}
        styles={styles}
      >
        <LineChart
          points={bbtPoints}
          color={colors.note}
          formatY={(v) => v.toFixed(1)}
          emptyText="Log temperatures on the Calendar tab to see this."
        />
      </ChartCard>

      <ChartCard title="Mood over time" summary={moodSummary} styles={styles}>
        <LineChart
          points={moodPoints}
          color={colors.note}
          minValue={0.5}
          maxValue={4.5}
          ySteps={4}
          formatY={(v) => MOOD_LABEL[Math.round(v)] ?? ""}
          emptyText="Log moods on the Calendar tab to see this."
        />
      </ChartCard>

      <ChartCard
        title="Energy over time"
        summary={energySummary}
        styles={styles}
      >
        <LineChart
          points={energyPoints}
          color={colors.accent}
          minValue={0.5}
          maxValue={3.5}
          ySteps={3}
          formatY={(v) => ENERGY_LABEL[Math.round(v)] ?? ""}
          emptyText="Log energy on the Calendar tab to see this."
        />
      </ChartCard>
    </ScrollView>
  );
}

function ChartCard({
  title,
  summary,
  children,
  styles,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.summary}>{summary}</Text>
      <View style={styles.chartWrap}>{children}</View>
    </View>
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
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.accentDeep,
      marginBottom: 4,
    },
    summary: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 12,
    },
    chartWrap: {
      alignItems: "center",
    },
  });
}
