import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { PeriodEntry } from "../types";
import { parseDate, formatDate, toISO } from "../lib/utils/dates";
import { useTheme } from "../lib/theme";

interface Props {
  entries: PeriodEntry[];
  onDelete: (id: number) => void;
}

export function HistoryList({ entries, onDelete }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  // ---- Filter state ----
  const [searchText, setSearchText] = useState("");
  const [symptomFilter, setSymptomFilter] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // ---- Collect all unique symptoms from entries ----
  const allSymptoms = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      for (const s of e.symptoms ?? []) set.add(s);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  // ---- Apply filters ----
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const fromIso = fromDate ? toISO(fromDate) : null;
    const toIso = toDate ? toISO(toDate) : null;

    return entries
      .filter((e) => {
        if (q && !(e.notes ?? "").toLowerCase().includes(q)) return false;
        if (symptomFilter && !(e.symptoms ?? []).includes(symptomFilter))
          return false;
        if (fromIso && e.startDate < fromIso) return false;
        if (toIso && e.startDate > toIso) return false;
        return true;
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [entries, searchText, symptomFilter, fromDate, toDate]);

  const hasActiveFilters =
    searchText.trim() !== "" ||
    symptomFilter !== null ||
    fromDate !== null ||
    toDate !== null;

  function clearFilters() {
    setSearchText("");
    setSymptomFilter(null);
    setFromDate(null);
    setToDate(null);
  }

  // ---- Empty states ----
  if (entries.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.muted}>No periods logged yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>History</Text>

      {/* ---- Filter bar ---- */}
      <TextInput
        style={styles.searchInput}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search notes…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {allSymptoms.length > 0 && (
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setSymptomFilter(null)}
            style={[styles.chip, symptomFilter === null && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                symptomFilter === null && styles.chipTextActive,
              ]}
            >
              All symptoms
            </Text>
          </Pressable>
          {allSymptoms.map((s) => {
            const active = symptomFilter === s;
            return (
              <Pressable
                key={s}
                onPress={() => setSymptomFilter(active ? null : s)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.dateRow}>
        <Pressable
          style={styles.dateBtn}
          onPress={() => setShowFromPicker(true)}
        >
          <Text style={styles.dateBtnLabel}>From</Text>
          <Text style={styles.dateBtnValue}>
            {fromDate ? formatDate(fromDate) : "Any"}
          </Text>
        </Pressable>

        <Pressable style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
          <Text style={styles.dateBtnLabel}>To</Text>
          <Text style={styles.dateBtnValue}>
            {toDate ? formatDate(toDate) : "Any"}
          </Text>
        </Pressable>
      </View>

      {hasActiveFilters && (
        <Pressable onPress={clearFilters} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Clear filters</Text>
        </Pressable>
      )}

      {showFromPicker && (
        <DateTimePicker
          value={fromDate ?? new Date()}
          mode="date"
          onChange={(_event, date) => {
            setShowFromPicker(false);
            if (date) setFromDate(date);
          }}
        />
      )}
      {showToPicker && (
        <DateTimePicker
          value={toDate ?? new Date()}
          mode="date"
          onChange={(_event, date) => {
            setShowToPicker(false);
            if (date) setToDate(date);
          }}
        />
      )}

      {/* ---- Result count ---- */}
      {hasActiveFilters && (
        <Text style={styles.resultCount}>
          {filtered.length} of {entries.length}{" "}
          {entries.length === 1 ? "entry" : "entries"}
        </Text>
      )}

      {/* ---- Entries ---- */}
      {filtered.length === 0 ? (
        <Text style={styles.muted}>No entries match your filter.</Text>
      ) : (
        filtered.map((entry, index) => {
          const start = formatDate(parseDate(entry.startDate));
          const end = entry.endDate
            ? ` → ${formatDate(parseDate(entry.endDate))}`
            : "";
          const isLast = index === filtered.length - 1;

          return (
            <View key={entry.id} style={[styles.row, isLast && styles.rowLast]}>
              <View style={styles.info}>
                <Text style={styles.date}>
                  {start}
                  {end}
                </Text>

                {entry.symptoms.length > 0 && (
                  <View style={styles.tags}>
                    {entry.symptoms.map((s) => (
                      <View key={s} style={styles.tag}>
                        <Text style={styles.tagText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {entry.notes && (
                  <Text style={styles.notes} numberOfLines={2}>
                    {entry.notes}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={() => onDelete(entry.id)}
                style={styles.deleteBtn}
                hitSlop={8}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          );
        })
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
    muted: {
      fontSize: 14,
      color: colors.textMuted,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surfaceAlt,
      marginBottom: 8,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 8,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
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
      fontSize: 12,
      fontWeight: "600",
      color: colors.textLabel,
    },
    chipTextActive: {
      color: colors.accentDeep,
    },
    dateRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 8,
    },
    dateBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surfaceAlt,
    },
    dateBtnLabel: {
      fontSize: 10,
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    dateBtnValue: {
      fontSize: 13,
      color: colors.text,
      marginTop: 2,
      fontWeight: "600",
    },
    clearBtn: {
      alignSelf: "flex-start",
      marginBottom: 8,
    },
    clearBtnText: {
      fontSize: 12,
      color: colors.accentDeep,
      fontWeight: "600",
    },
    resultCount: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
      fontStyle: "italic",
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    info: {
      flex: 1,
    },
    date: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    tags: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
      marginTop: 6,
    },
    tag: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    tagText: {
      fontSize: 11,
      color: colors.accentDeep,
      fontWeight: "600",
    },
    notes: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
    },
    deleteBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      backgroundColor: colors.surface,
      alignSelf: "flex-start",
    },
    deleteText: {
      fontSize: 12,
      color: colors.danger,
      fontWeight: "600",
    },
  });
}
