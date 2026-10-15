import { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import type { DayNote, FlowLevel, MoodLevel, EnergyLevel } from "../types";
import { parseDate } from "../lib/utils/dates";
import { useTheme } from "../lib/theme";
import {
  isSpeechAvailable,
  requestSpeechPermission,
  startSpeech,
  stopSpeech,
  useSpeechRecognitionEvent,
} from "../lib/speech";

const FLOW_OPTIONS: { value: FlowLevel; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
];

const MOOD_OPTIONS: { value: MoodLevel; label: string; emoji: string }[] = [
  { value: "awful", label: "Awful", emoji: "😞" },
  { value: "meh", label: "Meh", emoji: "😐" },
  { value: "good", label: "Good", emoji: "🙂" },
  { value: "great", label: "Great", emoji: "😄" },
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; emoji: string }[] = [
  { value: "low", label: "Low", emoji: "🔋" },
  { value: "medium", label: "Medium", emoji: "⚡" },
  { value: "high", label: "High", emoji: "🔥" },
];

const WATER_MAX = 8;
const WATER_HARD_MAX = 12;

interface Props {
  iso: string | null;
  note: DayNote | null;
  bbtUnit: "C" | "F";
  onClose: () => void;
  onSave: (note: DayNote) => void;
  onDelete: () => void;
  onToggleUnit: () => void;
}

function emptyNote(): DayNote {
  return {
    note: "",
    flow: null,
    bbt: null,
    mood: null,
    energy: null,
    water: null,
  };
}

function bbtToDisplay(celsius: number | null, unit: "C" | "F"): string {
  if (celsius == null) return "";
  return unit === "C"
    ? celsius.toFixed(2)
    : ((celsius * 9) / 5 + 32).toFixed(2);
}

function bbtFromDisplay(str: string, unit: "C" | "F"): number | null {
  const n = parseFloat(str);
  if (!isFinite(n)) return null;
  return unit === "C" ? n : ((n - 32) * 5) / 9;
}

export function DayDetailModal({
  iso,
  note,
  bbtUnit,
  onClose,
  onSave,
  onDelete,
  onToggleUnit,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [draft, setDraft] = useState<DayNote>(emptyNote());
  const [bbtText, setBbtText] = useState("");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Base note text at the moment recording started
  const baseNoteRef = useRef("");
  // Latest interim transcript from the current session
  const latestInterimRef = useRef("");

  // Reset draft when opening for a new day
  useEffect(() => {
    if (iso) {
      const initial = note ? { ...note } : emptyNote();
      setDraft(initial);
      setBbtText(bbtToDisplay(initial.bbt, bbtUnit));
      setListening(false);
      setInterim("");
      setSpeechError(null);
      latestInterimRef.current = "";
      baseNoteRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  // Stop speech when modal closes
  useEffect(() => {
    if (!iso && listening) {
      stopSpeech();
      setListening(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  /**
   * Commit the latest interim text to the note field.
   * Called when the session ends (either by user tapping stop, or by the
   * engine signalling it's finished). On many Android devices, isFinal
   * events never fire — so we commit the last interim we received.
   */
  function commitInterim() {
    const latest = latestInterimRef.current.trim();
    if (!latest) return;
    const base = baseNoteRef.current.trim();
    const combined = base ? `${base} ${latest}` : latest;
    setDraft((prev) => ({ ...prev, note: combined }));
    // The new base becomes what we just committed
    baseNoteRef.current = combined;
    latestInterimRef.current = "";
    setInterim("");
  }

  // ---- Speech events ----

  useSpeechRecognitionEvent("start", () => {
    console.log("[speech] start event");
  });

  useSpeechRecognitionEvent("result", (event) => {
    if (!event.results || event.results.length === 0) return;
    const first = event.results[0];
    const text = first.transcript ?? "";
    console.log("[speech] isFinal:", event.isFinal, "text:", text);

    if (event.isFinal) {
      // Some devices DO send final events. Use them.
      const base = baseNoteRef.current.trim();
      const combined = base ? `${base} ${text.trim()}` : text.trim();
      setDraft((prev) => ({ ...prev, note: combined }));
      baseNoteRef.current = combined;
      latestInterimRef.current = "";
      setInterim("");
    } else {
      // Interim event — remember it and display as "Listening… 'text'"
      latestInterimRef.current = text;
      setInterim(text);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.log("[speech] error event:", JSON.stringify(event));
    setSpeechError(event.message ?? "Recognition failed");
    setListening(false);
    // Do NOT commit on error — the transcript is unreliable
    latestInterimRef.current = "";
    setInterim("");
  });

  useSpeechRecognitionEvent("end", () => {
    console.log("[speech] end event — committing interim");
    setListening(false);
    commitInterim();
  });

  async function toggleMic() {
    setSpeechError(null);

    if (listening) {
      // Stop the session — the "end" event will commit the interim
      stopSpeech();
      return;
    }

    if (!isSpeechAvailable()) {
      Alert.alert(
        "Speech not available",
        "Speech recognition isn't supported on this device."
      );
      return;
    }

    const granted = await requestSpeechPermission();
    if (!granted) {
      Alert.alert(
        "Microphone permission",
        "Enable microphone access in settings to dictate notes."
      );
      return;
    }

    baseNoteRef.current = draft.note.trim();
    latestInterimRef.current = "";
    setInterim("");
    setListening(true);

    startSpeech({
      onError: (msg) => {
        setSpeechError(msg);
        setListening(false);
        latestInterimRef.current = "";
        setInterim("");
      },
      onEnd: () => {
        setListening(false);
      },
    });
  }

  if (!iso) return null;

  const date = parseDate(iso);
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function update<K extends keyof DayNote>(key: K, value: DayNote[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleToggleUnit() {
    const celsius = bbtFromDisplay(bbtText, bbtUnit);
    onToggleUnit();
    const nextUnit: "C" | "F" = bbtUnit === "C" ? "F" : "C";
    setBbtText(bbtToDisplay(celsius, nextUnit));
  }

  function handleSave() {
    const bbt = bbtText.trim() === "" ? null : bbtFromDisplay(bbtText, bbtUnit);
    onSave({ ...draft, bbt });
  }

  const isEmpty =
    !draft.note &&
    !draft.flow &&
    draft.bbt == null &&
    !draft.mood &&
    !draft.energy &&
    draft.water == null;

  return (
    <Modal
      visible={!!iso}
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
            <Text style={styles.title}>Day details</Text>
            <Text style={styles.subtitle}>{dateLabel}</Text>

            <Text style={styles.label}>Flow</Text>
            <View style={styles.segmented}>
              {FLOW_OPTIONS.map((opt) => {
                const active = draft.flow === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => update("flow", active ? null : opt.value)}
                    style={[
                      styles.segment,
                      active && flowSegmentStyle(opt.value, colors),
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Mood</Text>
            <View style={styles.chipRow}>
              {MOOD_OPTIONS.map((opt) => {
                const active = draft.mood === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => update("mood", active ? null : opt.value)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Energy</Text>
            <View style={styles.chipRow}>
              {ENERGY_OPTIONS.map((opt) => {
                const active = draft.energy === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => update("energy", active ? null : opt.value)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>
              Water{" "}
              <Text style={styles.labelMuted}>
                ({draft.water ?? 0} cup{(draft.water ?? 0) === 1 ? "" : "s"})
              </Text>
            </Text>
            <View style={styles.waterRow}>
              {Array.from({
                length: Math.min(
                  WATER_HARD_MAX,
                  Math.max(WATER_MAX, (draft.water ?? 0) + 1)
                ),
              }).map((_, i) => {
                const n = i + 1;
                const filled = (draft.water ?? 0) >= n;
                return (
                  <Pressable
                    key={n}
                    onPress={() =>
                      update("water", n === draft.water ? n - 1 : n)
                    }
                    style={[styles.waterCup, filled && styles.waterCupFilled]}
                  />
                );
              })}
            </View>

            <Text style={styles.label}>
              Basal body temperature{" "}
              <Text style={styles.labelMuted}>(°{bbtUnit})</Text>
            </Text>
            <View style={styles.bbtRow}>
              <TextInput
                style={styles.bbtInput}
                value={bbtText}
                onChangeText={setBbtText}
                placeholder={bbtUnit === "C" ? "e.g. 36.70" : "e.g. 98.06"}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                maxLength={10}
              />
              <Pressable onPress={handleToggleUnit} style={styles.unitBtn}>
                <Text style={styles.unitBtnText}>°C / °F</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Note</Text>
            <View style={styles.noteRow}>
              <TextInput
                style={styles.noteInput}
                value={draft.note}
                onChangeText={(v) => {
                  update("note", v);
                  baseNoteRef.current = v;
                }}
                placeholder="How are you feeling today?"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={500}
              />
              <Pressable
                onPress={toggleMic}
                style={[styles.micBtn, listening && styles.micBtnListening]}
                hitSlop={6}
              >
                <Text style={styles.micIcon}>{listening ? "■" : "🎤"}</Text>
              </Pressable>
            </View>
            {listening && (
              <Text style={styles.micStatus}>
                Listening{interim ? `… "${interim}"` : "…"}
              </Text>
            )}
            {speechError && !listening && (
              <Text style={styles.micError}>{speechError}</Text>
            )}

            <View style={styles.actions}>
              {!isEmpty && (
                <Pressable onPress={onDelete} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              )}
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

function flowSegmentStyle(
  flow: FlowLevel,
  colors: ReturnType<typeof useTheme>["colors"]
) {
  switch (flow) {
    case "light":
      return { backgroundColor: colors.flowLight };
    case "medium":
      return { backgroundColor: colors.flowMedium };
    case "heavy":
      return { backgroundColor: colors.flowHeavy };
  }
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
    labelMuted: {
      color: colors.textMuted,
      fontWeight: "400",
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
    segmentText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textLabel,
    },
    segmentTextActive: {
      color: "#fff",
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    chipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    chipEmoji: {
      fontSize: 14,
    },
    chipText: {
      fontSize: 13,
      color: colors.textLabel,
      fontWeight: "600",
    },
    chipTextActive: {
      color: colors.accentDeep,
    },
    waterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    waterCup: {
      width: 32,
      height: 40,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    waterCupFilled: {
      backgroundColor: colors.note,
      borderColor: colors.note,
    },
    bbtRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    bbtInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surfaceAlt,
    },
    unitBtn: {
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    unitBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.accentDeep,
    },
    noteRow: {
      position: "relative",
    },
    noteInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingRight: 52,
      paddingVertical: 11,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surfaceAlt,
      minHeight: 90,
      textAlignVertical: "top",
    },
    micBtn: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    micBtnListening: {
      backgroundColor: colors.danger,
      borderColor: colors.danger,
    },
    micIcon: {
      fontSize: 18,
      color: colors.text,
    },
    micStatus: {
      marginTop: 6,
      fontSize: 12,
      color: colors.accentDeep,
      fontStyle: "italic",
    },
    micError: {
      marginTop: 6,
      fontSize: 12,
      color: colors.danger,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
      gap: 8,
    },
    deleteBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    deleteText: {
      color: colors.danger,
      fontWeight: "600",
      fontSize: 13,
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