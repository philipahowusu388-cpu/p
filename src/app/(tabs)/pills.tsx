import { useState } from "react";
import { ScrollView, StyleSheet, Alert } from "react-native";
import { useAppStore } from "../../lib/store";
import { TodayDosesCard } from "../../components/TodayDosesCard";
import { PillsHistoryGrid } from "../../components/PillsHistoryGrid";
import { ContraceptiveList } from "../../components/ContraceptiveList";
import { ContraceptiveModal } from "../../components/ContraceptiveModal";
import type { Contraceptive } from "../../types";
import { today } from "../../lib/utils/dates";
import { useTheme } from "../../lib/theme";

export default function PillsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const contraceptives = useAppStore((s) => s.contraceptives);
  const log = useAppStore((s) => s.contraceptiveLog);
  const markDose = useAppStore((s) => s.markDose);
  const addContraceptive = useAppStore((s) => s.addContraceptive);
  const updateContraceptive = useAppStore((s) => s.updateContraceptive);
  const removeContraceptive = useAppStore((s) => s.removeContraceptive);
  const toggleContraceptive = useAppStore((s) => s.toggleContraceptive);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Contraceptive | null>(null);

  const now = today();

  function openAdd() {
    setEditing(null);
    setModalVisible(true);
  }

  function openEdit(c: Contraceptive) {
    setEditing(c);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditing(null);
  }

  async function handleSave(
    partial: Omit<Contraceptive, "id">,
    editingId: string | null,
  ) {
    if (editingId) {
      const existing = contraceptives.find((c) => c.id === editingId);
      if (existing) {
        await updateContraceptive({
          ...existing,
          ...partial,
          id: existing.id,
          active: existing.active,
        });
      }
    } else {
      await addContraceptive(partial);
    }
    closeModal();
  }

  function handleDelete(id: string) {
    const c = contraceptives.find((x) => x.id === id);
    if (!c) return;
    Alert.alert(
      "Delete contraceptive",
      `Delete "${c.name}"? Its dose history will remain but the schedule will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeContraceptive(id),
        },
      ],
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TodayDosesCard
          contraceptives={contraceptives}
          log={log}
          onTake={(id) => markDose(id, now, "taken")}
          onSkip={(id) => markDose(id, now, "skipped")}
          onUndo={(id) => markDose(id, now, null)}
          onAddPress={openAdd}
        />

        <PillsHistoryGrid contraceptives={contraceptives} log={log} />

        <ContraceptiveList
          contraceptives={contraceptives}
          onEdit={openEdit}
          onToggle={(id) => toggleContraceptive(id)}
          onDelete={handleDelete}
        />
      </ScrollView>

      <ContraceptiveModal
        visible={modalVisible}
        editing={editing}
        onClose={closeModal}
        onSave={handleSave}
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
  });
}
