import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useAppStore } from "../lib/store";
import { useTheme } from "../lib/theme";

const MAX_SYMPTOMS = 30;

export function CustomSymptomsCard() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const symptoms = useAppStore((s) => s.customSymptoms);
  const addSymptom = useAppStore((s) => s.addCustomSymptom);
  const removeSymptom = useAppStore((s) => s.removeCustomSymptom);

  const [input, setInput] = useState("");

  async function handleAdd() {
    const val = input.trim();
    if (!val) return;
    if (symptoms.length >= MAX_SYMPTOMS) {
      Alert.alert(
        "Limit reached",
        `You can have up to ${MAX_SYMPTOMS} custom symptoms.`,
      );
      return;
    }
    if (symptoms.some((s) => s.toLowerCase() === val.toLowerCase())) {
      Alert.alert("Duplicate", "That symptom already exists.");
      return;
    }
    await addSymptom(val);
    setInput("");
  }

  function handleRemove(name: string) {
    Alert.alert(`Remove "${name}"?`, "It will disappear from the Log form.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeSymptom(name),
      },
    ]);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Custom symptoms</Text>
      <Text style={styles.desc}>
        Add your own symptoms to the Log form. They appear as chips when logging
        a period.
      </Text>

      {symptoms.length > 0 ? (
        <View style={styles.list}>
          {symptoms.map((s) => (
            <View key={s} style={styles.tag}>
              <Text style={styles.tagText}>{s}</Text>
              <Pressable
                onPress={() => handleRemove(s)}
                style={styles.removeBtn}
                hitSlop={8}
              >
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>No custom symptoms yet.</Text>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="e.g. Migraine"
          placeholderTextColor={colors.textMuted}
          maxLength={30}
          onSubmitEditing={handleAdd}
        />
        <Pressable onPress={handleAdd} style={styles.addBtn}>
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>
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
      marginBottom: 6,
    },
    desc: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 12,
      lineHeight: 17,
    },
    list: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 12,
    },
    tag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingLeft: 12,
      paddingRight: 4,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
    },
    tagText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.accentDeep,
    },
    removeBtn: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    removeText: {
      fontSize: 16,
      color: colors.accentDeep,
      lineHeight: 18,
    },
    empty: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 12,
      fontStyle: "italic",
    },
    inputRow: {
      flexDirection: "row",
      gap: 8,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surfaceAlt,
    },
    addBtn: {
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    addBtnText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
