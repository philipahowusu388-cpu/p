import { View, Text, StyleSheet, Pressable, Share } from "react-native";
import type { PeriodEntry, Profile } from "../types";
import {
  computePredictions,
  getRegularityInsight,
} from "../lib/domain/predictions";
import { formatDate, daysBetween, today } from "../lib/utils/dates";
import { buildShareTexts } from "../lib/share";
import { useTheme } from "../lib/theme";

interface Props {
  entries: PeriodEntry[];
  profile: Profile | null;
}

export function PredictionsPanel({ entries, profile }: Props) {
  const { colors, scheme } = useTheme();
  const styles = makeStyles(colors);

  const predictions = computePredictions(entries);

  async function handleShare() {
    const { compact, friendly } = buildShareTexts(entries, profile);
    try {
      await Share.share({
        message: friendly,
        title: "Cycle info",
      });
      // compact is available if you want to switch based on user preference
      void compact;
    } catch {
      // user cancelled or share failed — ignore
    }
  }

  if (!predictions) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Predictions</Text>
        <Text style={styles.muted}>
          Add at least one period to see predictions.
        </Text>
      </View>
    );
  }

  const regularity = getRegularityInsight(entries);
  const daysToNext = daysBetween(today(), predictions.nextStart);
  const sameRange =
    predictions.nextStartEarly.toDateString() ===
    predictions.nextStartLate.toDateString();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Predictions</Text>
        <Pressable onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>↗ Share</Text>
        </Pressable>
      </View>

      <Row label="Average cycle" value={`${predictions.cycle} days`} styles={styles} />
      <Row label="Average period" value={`${predictions.periodLen} days`} styles={styles} />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Regularity</Text>
        <View
          style={[styles.pill, regularityPillStyle(regularity.cls, colors)]}
        >
          <Text
            style={[
              styles.pillText,
              regularityTextStyle(regularity.cls, colors),
            ]}
          >
            {regularity.label}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Next period expected</Text>
      <View style={styles.bigRow}>
        <Text style={styles.bigText}>
          {formatDate(predictions.nextStart)} – {formatDate(predictions.nextEnd)}
        </Text>
        <View
          style={[
            styles.pill,
            confidencePillStyle(predictions.confidence.label, colors, scheme),
          ]}
        >
          <Text
            style={[
              styles.pillText,
              confidenceTextStyle(predictions.confidence.label, colors, scheme),
            ]}
          >
            {predictions.confidence.score}%
          </Text>
        </View>
      </View>

      <Text style={styles.rangeNote}>
        Likely start:{" "}
        {sameRange
          ? formatDate(predictions.nextStartEarly)
          : `${formatDate(predictions.nextStartEarly)} – ${formatDate(
              predictions.nextStartLate
            )}`}
      </Text>

      <View style={styles.spacer} />

      <Row
        label="Estimated ovulation"
        value={formatDate(predictions.ovulation)}
        styles={styles}
      />
      <Row
        label="Fertile window"
        value={`${formatDate(predictions.fertileStart)} – ${formatDate(
          predictions.fertileEnd
        )}`}
        styles={styles}
      />

      <Text style={styles.footerNote}>
        {daysToNext >= 0
          ? `In ${daysToNext} day${daysToNext === 1 ? "" : "s"} from today.`
          : `${Math.abs(daysToNext)} day${
              Math.abs(daysToNext) === 1 ? "" : "s"
            } overdue.`}
      </Text>
    </View>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function regularityPillStyle(
  cls: "regular" | "somewhat" | "irregular" | "unknown",
  colors: ReturnType<typeof useTheme>["colors"]
) {
  switch (cls) {
    case "regular":
      return { backgroundColor: colors.fertile };
    case "somewhat":
      return { backgroundColor: "#ffe0b2" };
    case "irregular":
      return { backgroundColor: colors.dangerBg };
    case "unknown":
      return { backgroundColor: colors.surfaceAlt };
  }
}

function regularityTextStyle(
  cls: "regular" | "somewhat" | "irregular" | "unknown",
  colors: ReturnType<typeof useTheme>["colors"]
) {
  switch (cls) {
    case "regular":
      return { color: colors.text };
    case "somewhat":
      return { color: "#6b3a00" };
    case "irregular":
      return { color: colors.danger };
    case "unknown":
      return { color: colors.textMuted };
  }
}

function confidencePillStyle(
  label: "low" | "medium" | "high",
  colors: ReturnType<typeof useTheme>["colors"],
  scheme: "light" | "dark"
) {
  const dark = scheme === "dark";
  switch (label) {
    case "high":
      return { backgroundColor: colors.fertile };
    case "medium":
      return { backgroundColor: dark ? "#3a2a10" : "#fff2df" };
    case "low":
      return { backgroundColor: colors.dangerBg };
  }
}

function confidenceTextStyle(
  label: "low" | "medium" | "high",
  colors: ReturnType<typeof useTheme>["colors"],
  scheme: "light" | "dark"
) {
  const dark = scheme === "dark";
  switch (label) {
    case "high":
      return { color: colors.text };
    case "medium":
      return { color: dark ? "#f5cf9d" : "#7a4a10" };
    case "low":
      return { color: colors.danger };
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.accentDeep,
    },
    shareBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    shareBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.accentDeep,
    },
    muted: {
      fontSize: 14,
      color: colors.textMuted,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginVertical: 4,
    },
    rowLabel: {
      fontSize: 14,
      color: colors.textMuted,
    },
    rowValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: colors.borderSoft,
      marginVertical: 12,
    },
    sectionLabel: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 4,
    },
    bigRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
    },
    bigText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.accentDeep,
    },
    rangeNote: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    spacer: {
      height: 12,
    },
    footerNote: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 12,
      fontStyle: "italic",
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
    },
    pillText: {
      fontSize: 12,
      fontWeight: "700",
    },
  });
}