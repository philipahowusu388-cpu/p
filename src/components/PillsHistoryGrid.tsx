import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Contraceptive, ContraceptiveLog } from "../types";
import {
  isDoseDay,
  doseState,
  doseStateLabel,
  type ExtendedDoseState,
} from "../lib/domain/pills";
import { addDays, toISO, today } from "../lib/utils/dates";
import { useTheme } from "../lib/theme";

interface Props {
  contraceptives: Contraceptive[];
  log: ContraceptiveLog;
}

export function PillsHistoryGrid({ contraceptives, log }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const active = contraceptives.filter((c) => c.active);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (active.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>14-day history</Text>
        <Text style={styles.empty}>Add a contraceptive to see history.</Text>
      </View>
    );
  }

  const selected = active.find((c) => c.id === selectedId) ?? active[0];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>14-day history</Text>

      <View style={styles.pickerRow}>
        {active.map((c) => {
          const isSelected = c.id === selected.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setSelectedId(c.id)}
              style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
            >
              <View style={[styles.swatch, { backgroundColor: c.color }]} />
              <Text
                style={[
                  styles.pickerChipText,
                  isSelected && styles.pickerChipTextActive,
                ]}
                numberOfLines={1}
              >
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.grid}>
        {renderDays(selected, log, styles, colors)}
      </View>

      <View style={styles.legend}>
        <LegendDot color={colors.ovulation} label="Taken" styles={styles} />
        <LegendDot color="#f5a962" label="Late" styles={styles} />
        <LegendDot color={colors.danger} label="Missed" styles={styles} />
        <LegendDot color={colors.textMuted} label="Skipped" styles={styles} />
        <LegendDot color={colors.border} label="Not due" styles={styles} />
      </View>
    </View>
  );
}

function renderDays(
  c: Contraceptive,
  log: ContraceptiveLog,
  styles: ReturnType<typeof makeStyles>,
  colors: ReturnType<typeof useTheme>["colors"],
) {
  const now = today();
  const cells = [];

  for (let i = 13; i >= 0; i--) {
    const day = addDays(now, -i);
    const iso = toISO(day);

    if (!isDoseDay(c, day)) {
      cells.push(
        <View key={iso} style={[styles.cell, styles.cellNotDue]}>
          <Text style={styles.cellDay}>{day.getDate()}</Text>
        </View>,
      );
      continue;
    }

    const state = doseState(c, day, log, new Date());
    cells.push(
      <View
        key={iso}
        style={[styles.cell, cellStyle(state, colors)]}
        accessible
        accessibilityLabel={`${iso}: ${doseStateLabel(state)}`}
      >
        <Text
          style={[
            styles.cellDay,
            (state === "taken" ||
              state === "missed" ||
              state === "late" ||
              state === "skipped") &&
              styles.cellDayOnColor,
          ]}
        >
          {day.getDate()}
        </Text>
      </View>,
    );
  }

  return cells;
}

function cellStyle(
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
      return { backgroundColor: colors.border };
  }
}

function LegendDot({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.accentDeep,
      marginBottom: 12,
    },
    empty: {
      fontSize: 14,
      color: colors.textMuted,
    },
    pickerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 12,
    },
    pickerChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      maxWidth: 160,
    },
    pickerChipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    pickerChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textLabel,
      flexShrink: 1,
    },
    pickerChipTextActive: {
      color: colors.accentDeep,
    },
    swatch: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 3,
    },
    cell: {
      width: 22,
      aspectRatio: 1,
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    cellNotDue: {
      backgroundColor: colors.borderSoft,
    },
    cellDay: {
      fontSize: 10,
      color: colors.textLabel,
    },
    cellDayOnColor: {
      color: "#fff",
      fontWeight: "700",
    },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 12,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 11,
      color: colors.textLabel,
    },
  });
}
