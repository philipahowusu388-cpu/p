import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../lib/theme";
import { toISO, today } from "../lib/utils/dates";

const BUILT_IN_SYMPTOMS = [
  "Cramps",
  "Headache",
  "Bloating",
  "Fatigue",
  "Mood swings",
  "Acne",
  "Back pain",
  "Nausea",
];

interface Props {
  customSymptoms: string[];
  onSubmit: (entry: {
    startDate: string;
    endDate: string | null;
    notes: string | null;
    symptoms: string[];
  }) => void;
}

export function LogPeriodForm({ customSymptoms, onSubmit }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [startDate, setStartDate] = useState<Date>(today());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const allSymptoms = [...BUILT_IN_SYMPTOMS, ...customSymptoms];

  function toggleSymptom(s: string) {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function handleSubmit() {
    if (endDate && endDate < startDate) return;
    onSubmit({
      startDate: toISO(startDate),
      endDate: endDate ? toISO(endDate) : null,
      notes: notes.trim() || null,
      symptoms,
    });
    setStartDate(today());
    setEndDate(null);
    setNotes("");
    setSymptoms([]);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Log a period</Text>

      <Text style={styles.label}>Start date</Text>
      <Pressable
        style={styles.dateField}
        onPress={() => setShowStartPicker(true)}
      >
        <Text style={styles.dateText}>
          {startDate.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </Text>
      </Pressable>
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onValueChange={(_, date) => {
            if (Platform.OS === "android") setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
          onDismiss={() => setShowStartPicker(false)}
        />
      )}

      <Text style={styles.label}>End date (optional)</Text>
      <Pressable
        style={styles.dateField}
        onPress={() => setShowEndPicker(true)}
      >
        <Text style={[styles.dateText, !endDate && styles.datePlaceholder]}>
          {endDate
            ? endDate.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "Tap to set end date"}
        </Text>
      </Pressable>
      {endDate && (
        <Pressable onPress={() => setEndDate(null)} style={styles.clearEndBtn}>
          <Text style={styles.clearEndText}>Clear end date</Text>
        </Pressable>
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate ?? startDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={startDate}
          onValueChange={(_, date) => {
            if (Platform.OS === "android") setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
          onDismiss={() => setShowEndPicker(false)}
        />
      )}

      <Text style={styles.label}>Symptoms (optional)</Text>
      <View style={styles.chips}>
        {allSymptoms.map((s) => {
          const active = symptoms.includes(s);
          return (
            <Pressable
              key={s}
              onPress={() => toggleSymptom(s)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {s}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={styles.input}
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. flow was light"
        placeholderTextColor={colors.textMuted}
        maxLength={200}
      />

      <Pressable style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Add period</Text>
      </Pressable>
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
    label: {
      fontSize: 13,
      color: colors.textLabel,
      marginTop: 10,
      marginBottom: 6,
    },
    dateField: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      backgroundColor: colors.surfaceAlt,
    },
    dateText: {
      fontSize: 15,
      color: colors.text,
    },
    datePlaceholder: {
      color: colors.textMuted,
    },
    clearEndBtn: {
      marginTop: 6,
      alignSelf: "flex-start",
    },
    clearEndText: {
      fontSize: 12,
      color: colors.accentDeep,
      fontWeight: "600",
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    chipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    chipText: {
      fontSize: 13,
      color: colors.textLabel,
    },
    chipTextActive: {
      color: colors.accentDeep,
      fontWeight: "700",
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
    button: {
      marginTop: 18,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
    },
    buttonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
  });
}
