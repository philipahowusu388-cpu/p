import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Contraceptive } from "../types";
import { formatDoseSchedule } from "../lib/domain/pills";
import { parseDate, formatDate } from "../lib/utils/dates";
import { useTheme } from "../lib/theme";

interface Props {
  contraceptives: Contraceptive[];
  onEdit: (c: Contraceptive) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ContraceptiveList({
  contraceptives,
  onEdit,
  onToggle,
  onDelete,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your contraceptives</Text>

      {contraceptives.length === 0 ? (
        <Text style={styles.empty}>No contraceptives yet.</Text>
      ) : (
        contraceptives.map((c) => (
          <View key={c.id} style={styles.row}>
            <View style={[styles.colorBar, { backgroundColor: c.color }]} />

            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {c.name}
                {!c.active && <Text style={styles.paused}> (paused)</Text>}
              </Text>
              <Text style={styles.meta} numberOfLines={2}>
                {formatDoseSchedule(c)} · from{" "}
                {formatDate(parseDate(c.startedAt))}
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable onPress={() => onEdit(c)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => onToggle(c.id)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>
                  {c.active ? "Pause" : "Resume"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onDelete(c.id)}
                style={[styles.smallBtn, styles.dangerBtn]}
              >
                <Text style={styles.dangerText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
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
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
    },
    colorBar: {
      width: 10,
      alignSelf: "stretch",
      borderRadius: 5,
      minHeight: 40,
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    paused: {
      fontSize: 12,
      fontWeight: "400",
      color: colors.textMuted,
    },
    meta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    actions: {
      flexDirection: "row",
      gap: 6,
      flexShrink: 0,
    },
    smallBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    smallBtnText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.accentDeep,
    },
    dangerBtn: {
      borderColor: colors.dangerBorder,
    },
    dangerText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.danger,
    },
  });
}
