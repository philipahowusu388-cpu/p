import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Contraceptive, ContraceptiveLog } from "../types";
import {
  todayDoses,
  doseStateLabel,
  type ExtendedDoseState,
} from "../lib/domain/pills";
import { useTheme } from "../lib/theme";

interface Props {
  contraceptives: Contraceptive[];
  log: ContraceptiveLog;
  onTake: (id: string) => void;
  onSkip: (id: string) => void;
  onUndo: (id: string) => void;
  onAddPress: () => void;
}

export function TodayDosesCard({
  contraceptives,
  log,
  onTake,
  onSkip,
  onUndo,
  onAddPress,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const doses = todayDoses(contraceptives, log);
  const anyActive = contraceptives.some((c) => c.active);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Pressable onPress={onAddPress} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {doses.length === 0 ? (
        <Text style={styles.empty}>
          {anyActive
            ? "No doses scheduled today."
            : "No contraceptives added yet. Tap + Add to set one up."}
        </Text>
      ) : (
        <View style={styles.list}>
          {doses.map(({ contraceptive, state }) => (
            <DoseRow
              key={contraceptive.id}
              contraceptive={contraceptive}
              state={state}
              onTake={() => onTake(contraceptive.id)}
              onSkip={() => onSkip(contraceptive.id)}
              onUndo={() => onUndo(contraceptive.id)}
              styles={styles}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function DoseRow({
  contraceptive,
  state,
  onTake,
  onSkip,
  onUndo,
  styles,
  colors,
}: {
  contraceptive: Contraceptive;
  state: ExtendedDoseState;
  onTake: () => void;
  onSkip: () => void;
  onUndo: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const color = contraceptive.color || colors.accent;
  const isTaken = state === "taken";
  const isSkipped = state === "skipped";

  return (
    <View style={[styles.doseRow, stateBorderStyle(state, colors)]}>
      <View style={[styles.colorBar, { backgroundColor: color }]} />

      <View style={styles.doseInfo}>
        <Text style={styles.doseName} numberOfLines={1}>
          {contraceptive.name}
        </Text>
        <Text style={styles.doseMeta}>{contraceptive.schedule.time}</Text>
        {state !== "due" && state !== "notdue" && (
          <View style={[styles.statePill, statePillStyle(state, colors)]}>
            <Text style={styles.statePillText}>{doseStateLabel(state)}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {isTaken || isSkipped ? (
          <Pressable onPress={onUndo} style={styles.undoBtn}>
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        ) : (
          <>
            <Pressable onPress={onTake} style={styles.takeBtn}>
              <Text style={styles.takeText}>Take</Text>
            </Pressable>
            <Pressable onPress={onSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function stateBorderStyle(
  state: ExtendedDoseState,
  colors: ReturnType<typeof useTheme>["colors"],
) {
  switch (state) {
    case "taken":
      return { borderColor: colors.ovulation };
    case "skipped":
      return { borderColor: colors.textMuted };
    case "late":
      return { borderColor: "#f5a962" };
    case "missed":
      return { borderColor: colors.danger };
    default:
      return {};
  }
}

function statePillStyle(
  state: ExtendedDoseState,
  colors: ReturnType<typeof useTheme>["colors"],
) {
  switch (state) {
    case "taken":
      return { backgroundColor: colors.ovulation };
    case "skipped":
      return { backgroundColor: colors.textMuted };
    case "late":
      return { backgroundColor: "#f5a962" };
    case "missed":
      return { backgroundColor: colors.danger };
    default:
      return {};
  }
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
    },
    header: {
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
    addBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    addBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.accentDeep,
    },
    empty: {
      fontSize: 14,
      color: colors.textMuted,
    },
    list: {
      gap: 10,
    },
    doseRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      gap: 12,
    },
    colorBar: {
      width: 8,
      alignSelf: "stretch",
      borderRadius: 4,
    },
    doseInfo: {
      flex: 1,
      minWidth: 0,
    },
    doseName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    doseMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    statePill: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      marginTop: 4,
    },
    statePillText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#fff",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    actions: {
      flexDirection: "row",
      gap: 6,
    },
    takeBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.ovulation,
    },
    takeText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "700",
    },
    skipBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    skipText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    undoBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    undoText: {
      color: colors.accentDeep,
      fontSize: 13,
      fontWeight: "600",
    },
  });
}
