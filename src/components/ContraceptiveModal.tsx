import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { Contraceptive, ContraceptiveScheduleType } from "../types";
import { parseDate, toISO, today } from "../lib/utils/dates";
import { useTheme } from "../lib/theme";

const SWATCHES = [
  "#e88fb0",
  "#b39ddb",
  "#7cc47f",
  "#f5a962",
  "#6fb7e0",
  "#e06f8f",
];

const DAY_LABELS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const DAY_LABELS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface Props {
  visible: boolean;
  editing: Contraceptive | null;
  onClose: () => void;
  onSave: (c: Omit<Contraceptive, "id">, editingId: string | null) => void;
}

interface Draft {
  name: string;
  type: ContraceptiveScheduleType;
  days: number[];
  time: string;
  startedAt: Date;
  color: string;
}

function emptyDraft(): Draft {
  return {
    name: "",
    type: "daily",
    days: [],
    time: "21:00",
    startedAt: today(),
    color: SWATCHES[0],
  };
}

function draftFromContraceptive(c: Contraceptive): Draft {
  return {
    name: c.name,
    type: c.schedule.type,
    days: [...c.schedule.days],
    time: c.schedule.time,
    startedAt: parseDate(c.startedAt),
    color: c.color,
  };
}

export function ContraceptiveModal({
  visible,
  editing,
  onClose,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(editing ? draftFromContraceptive(editing) : emptyDraft());
      setError(null);
    }
  }, [visible, editing]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDay(d: number) {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.includes(d)
        ? prev.days.filter((x) => x !== d)
        : [...prev.days, d].sort((a, b) => a - b),
    }));
  }

  function handleSave() {
    setError(null);

    if (!draft.name.trim()) {
      setError("Name is required.");
      return;
    }

    let days: number[] = [];
    if (draft.type === "weekly") {
      if (draft.days.length !== 1) {
        setError("Pick exactly one day of the week.");
        return;
      }
      days = [draft.days[0]];
    } else if (draft.type === "custom") {
      if (draft.days.length === 0) {
        setError("Pick at least one day.");
        return;
      }
      days = draft.days;
    }

    onSave(
      {
        name: draft.name.trim(),
        schedule: {
          type: draft.type,
          days,
          time: draft.time,
        },
        startedAt: toISO(draft.startedAt),
        active: true,
        color: draft.color,
      },
      editing?.id ?? null,
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>
              {editing ? "Edit contraceptive" : "Add contraceptive"}
            </Text>
            <Text style={styles.subtitle}>
              Set up a daily, weekly, or custom-day schedule.
            </Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={draft.name}
              onChangeText={(v) => update("name", v)}
              placeholder="e.g. My pill"
              placeholderTextColor={colors.textMuted}
              maxLength={40}
            />

            <Text style={styles.label}>Schedule</Text>
            <View style={styles.segmented}>
              {(["daily", "weekly", "custom"] as const).map((t) => {
                const active = draft.type === t;
                const label =
                  t === "daily"
                    ? "Every day"
                    : t === "weekly"
                      ? "Once a week"
                      : "Specific days";
                return (
                  <Pressable
                    key={t}
                    onPress={() => update("type", t)}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {draft.type === "weekly" && (
              <>
                <Text style={styles.label}>Day of week</Text>
                <View style={styles.dayChips}>
                  {DAY_LABELS_LONG.map((label, i) => {
                    const active = draft.days.includes(i);
                    return (
                      <Pressable
                        key={i}
                        onPress={() => update("days", [i])}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            active && styles.dayChipTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {draft.type === "custom" && (
              <>
                <Text style={styles.label}>Days</Text>
                <View style={styles.dayChips}>
                  {DAY_LABELS.map(({ value, label }) => {
                    const active = draft.days.includes(value);
                    return (
                      <Pressable
                        key={value}
                        onPress={() => toggleDay(value)}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            active && styles.dayChipTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.label}>Time</Text>
            <Pressable
              style={styles.input}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.inputText}>{draft.time}</Text>
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={(() => {
                  const [h, m] = draft.time.split(":").map(Number);
                  const d = new Date();
                  d.setHours(h || 0, m || 0, 0, 0);
                  return d;
                })()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onValueChange={(_, date) => {
                  if (Platform.OS === "android") setShowTimePicker(false);
                  if (date) {
                    const hh = String(date.getHours()).padStart(2, "0");
                    const mm = String(date.getMinutes()).padStart(2, "0");
                    update("time", `${hh}:${mm}`);
                  }
                }}
                onDismiss={() => setShowTimePicker(false)}
              />
            )}

            <Text style={styles.label}>Start date</Text>
            <Pressable
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.inputText}>
                {draft.startedAt.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={draft.startedAt}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onValueChange={(_, date) => {
                  if (Platform.OS === "android") setShowDatePicker(false);
                  if (date) update("startedAt", date);
                }}
                onDismiss={() => setShowDatePicker(false)}
              />
            )}

            <Text style={styles.label}>Color</Text>
            <View style={styles.swatches}>
              {SWATCHES.map((c) => {
                const active = draft.color === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => update("color", c)}
                    style={[
                      styles.swatch,
                      { backgroundColor: c },
                      active && styles.swatchActive,
                    ]}
                  />
                );
              })}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.actions}>
              <View style={{ flex: 1 }} />
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 16,
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      maxHeight: "90%",
    },
    scroll: {
      maxHeight: "100%",
    },
    scrollContent: {
      padding: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.accentDeep,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      color: colors.textLabel,
      marginTop: 14,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surfaceAlt,
    },
    inputText: {
      fontSize: 15,
      color: colors.text,
    },
    segmented: {
      flexDirection: "row",
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 3,
      gap: 2,
    },
    segment: {
      flex: 1,
      paddingVertical: 9,
      alignItems: "center",
      borderRadius: 8,
    },
    segmentActive: {
      backgroundColor: colors.accent,
    },
    segmentText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textLabel,
    },
    segmentTextActive: {
      color: "#fff",
    },
    dayChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    dayChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    dayChipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    dayChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textLabel,
    },
    dayChipTextActive: {
      color: colors.accentDeep,
    },
    swatches: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    swatch: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 3,
      borderColor: "transparent",
    },
    swatchActive: {
      borderColor: colors.accentDeep,
    },
    error: {
      marginTop: 12,
      color: colors.danger,
      fontSize: 13,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
      gap: 8,
    },
    cancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelText: {
      color: colors.accentDeep,
      fontWeight: "600",
      fontSize: 13,
    },
    saveBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.accent,
    },
    saveText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 13,
    },
  });
}
