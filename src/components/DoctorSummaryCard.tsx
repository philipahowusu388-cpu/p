import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Constants from "expo-constants";
import { useAppStore } from "../lib/store";
import { loadProfiles, findProfile } from "../lib/profiles";
import { buildDoctorSummaryHTML } from "../lib/pdf";
import { useTheme } from "../lib/theme";

function isExpoGo(): boolean {
  try {
    return Constants.appOwnership === "expo";
  } catch {
    return false;
  }
}

export function DoctorSummaryCard() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const entries = useAppStore((s) => s.entries);
  const dayNotes = useAppStore((s) => s.dayNotes);
  const bbtUnit = useAppStore((s) => s.bbtUnit);

  const [busy, setBusy] = useState(false);

  async function handleGenerate() {
    if (isExpoGo()) {
      Alert.alert(
        "Not available in Expo Go",
        "PDF export uses the share sheet, which Expo Go doesn't allow apps to access. This works in the real Play Store build. Test it after we build the APK.",
        [{ text: "OK" }],
      );
      return;
    }

    setBusy(true);
    try {
      const profiles = await loadProfiles();
      const profile = findProfile(profiles, useAppStore.getState().profileId);

      const html = buildDoctorSummaryHTML(entries, dayNotes, profile, bbtUnit);

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save or share your cycle summary",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF generated", `Saved to ${uri}`);
      }
    } catch (err) {
      Alert.alert(
        "Could not generate PDF",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Doctor visit summary</Text>
      <Text style={styles.desc}>
        A one-page printable PDF with your last 6 months of cycles, average
        stats, a cycle length chart, and a list of symptoms. Hand it to your
        doctor or share it via email.
      </Text>

      <Pressable
        onPress={handleGenerate}
        disabled={busy}
        style={[styles.btn, busy && styles.btnDisabled]}
      >
        <Text style={styles.btnText}>
          {busy ? "Generating…" : "Generate PDF summary"}
        </Text>
      </Pressable>

      {entries.length === 0 && (
        <Text style={styles.note}>
          Log at least one period to generate a useful summary.
        </Text>
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
      marginBottom: 6,
    },
    desc: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 14,
      lineHeight: 18,
    },
    btn: {
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    btnDisabled: {
      opacity: 0.6,
    },
    btnText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#fff",
    },
    note: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 8,
      fontStyle: "italic",
    },
  });
}
