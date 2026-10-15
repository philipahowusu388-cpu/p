import { View, Text, StyleSheet } from "react-native";
import type { CyclePhase } from "../types";
import { useTheme } from "../lib/theme";

interface Props {
  phase: CyclePhase | null;
}

export function PhaseBanner({ phase }: Props) {
  const { colors, scheme } = useTheme();
  const styles = makeStyles(colors);

  if (!phase) return null;

  return (
    <View style={[styles.banner, phaseStyle(phase, colors, scheme)]}>
      <Text style={styles.emoji}>{phase.emoji}</Text>
      <Text style={styles.text}>
        <Text style={styles.label}>{phase.label}</Text>
        {" — "}
        {phase.desc}
      </Text>
    </View>
  );
}

function phaseStyle(
  phase: CyclePhase,
  colors: ReturnType<typeof useTheme>["colors"],
  scheme: "light" | "dark",
) {
  const dark = scheme === "dark";
  switch (phase.phase) {
    case "menstrual":
      return {
        backgroundColor: colors.accentSoft,
        borderColor: colors.accent,
      };
    case "follicular":
      return {
        backgroundColor: dark ? "#1e3323" : "#e8f4ee",
        borderColor: colors.ovulation,
      };
    case "ovulation":
      return {
        backgroundColor: dark ? "#3a2a10" : "#fff2df",
        borderColor: dark ? "#c98a3f" : "#f5a962",
      };
    case "luteal":
      return {
        backgroundColor: dark ? "#2a2035" : "#f0ecfa",
        borderColor: colors.note,
      };
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    emoji: {
      fontSize: 20,
    },
    text: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    label: {
      fontWeight: "700",
      color: colors.accentDeep,
    },
  });
}
