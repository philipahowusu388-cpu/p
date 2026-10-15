import { View, Text, StyleSheet } from "react-native";
import type { Milestone } from "../types";
import { useTheme } from "../lib/theme";

interface Props {
  current: number;
  best: number;
  milestones: Milestone[];
}

export function StreakCard({ current, best, milestones }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.flame}>🔥</Text>
        <View style={styles.info}>
          <Text style={styles.num}>
            <Text style={styles.numBig}>{current}</Text> day streak
          </Text>
          <Text style={styles.sub}>
            Best: {best} day{best === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      <View style={styles.milestones}>
        {milestones.map((m) => (
          <View
            key={m.days}
            style={[styles.milestone, m.earned && styles.milestoneEarned]}
          >
            <Text style={styles.milestoneText}>
              {m.emoji} {m.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      gap: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    flame: {
      fontSize: 36,
    },
    info: {
      flex: 1,
    },
    num: {
      fontSize: 15,
      color: colors.accentDeep,
      fontWeight: "600",
    },
    numBig: {
      fontSize: 22,
      fontWeight: "800",
    },
    sub: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    milestones: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    milestone: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      opacity: 0.5,
    },
    milestoneEarned: {
      opacity: 1,
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    milestoneText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.accentDeep,
    },
  });
}
