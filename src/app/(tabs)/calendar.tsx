import { useState } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable } from "react-native";
import { useAppStore } from "../../lib/store";
import { CalendarGrid } from "../../components/CalendarGrid";
import { DayDetailModal } from "../../components/DayDetailModal";
import type { DayNote } from "../../types";
import { useTheme } from "../../lib/theme";

export default function CalendarScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const entries = useAppStore((s) => s.entries);
  const dayNotes = useAppStore((s) => s.dayNotes);
  const bbtUnit = useAppStore((s) => s.bbtUnit);
  const setDayNote = useAppStore((s) => s.setDayNote);
  const removeDayNote = useAppStore((s) => s.removeDayNote);
  const setBbtUnit = useAppStore((s) => s.setBbtUnit);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [openIso, setOpenIso] = useState<string | null>(null);

  function prevMonth() {
    setCursor((c) => {
      const m = c.month - 1;
      if (m < 0) return { year: c.year - 1, month: 11 };
      return { year: c.year, month: m };
    });
  }

  function nextMonth() {
    setCursor((c) => {
      const m = c.month + 1;
      if (m > 11) return { year: c.year + 1, month: 0 };
      return { year: c.year, month: m };
    });
  }

  async function handleSave(note: DayNote) {
    if (!openIso) return;
    const empty =
      !note.note &&
      !note.flow &&
      note.bbt == null &&
      !note.mood &&
      !note.energy &&
      note.water == null;
    if (empty) {
      await removeDayNote(openIso);
    } else {
      await setDayNote(openIso, note);
    }
    setOpenIso(null);
  }

  async function handleDelete() {
    if (!openIso) return;
    await removeDayNote(openIso);
    setOpenIso(null);
  }

  async function handleToggleUnit() {
    await setBbtUnit(bbtUnit === "C" ? "F" : "C");
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={prevMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>‹</Text>
          </Pressable>
          <Pressable onPress={nextMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>›</Text>
          </Pressable>
        </View>

        <CalendarGrid
          year={cursor.year}
          month={cursor.month}
          entries={entries}
          dayNotes={dayNotes}
          onDayPress={(iso) => setOpenIso(iso)}
        />

        <View style={styles.hintCard}>
          <Text style={styles.hintText}>
            Tap any day to add a note, flow, mood, energy, water, or
            temperature.
          </Text>
        </View>
      </ScrollView>

      <DayDetailModal
        iso={openIso}
        note={openIso ? (dayNotes[openIso] ?? null) : null}
        bbtUnit={bbtUnit}
        onClose={() => setOpenIso(null)}
        onSave={handleSave}
        onDelete={handleDelete}
        onToggleUnit={handleToggleUnit}
      />
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: 16,
      paddingBottom: 48,
      gap: 12,
    },
    header: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
    navBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    navBtnText: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.accentDeep,
      lineHeight: 24,
    },
    hintCard: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    hintText: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 18,
    },
  });
}
