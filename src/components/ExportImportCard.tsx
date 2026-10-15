import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { useAppStore, todayISO } from "../lib/store";
import { useTheme } from "../lib/theme";
import {
  buildEncryptedBackup,
  detectBackupFormat,
  decryptEncryptedBackup,
  parseLegacyBackup,
  type BackupFormat,
} from "../lib/backup";

interface Props {
  profileName: string;
}

export function ExportImportCard({ profileName }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [busy, setBusy] = useState<"export" | "import" | null>(null);

  // Export modal state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);

  // Import modal state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importFormat, setImportFormat] = useState<BackupFormat>("encrypted");
  const [pendingImportText, setPendingImportText] = useState<string | null>(
    null,
  );

  const entries = useAppStore((s) => s.entries);
  const dayNotes = useAppStore((s) => s.dayNotes);
  const customSymptoms = useAppStore((s) => s.customSymptoms);
  const bbtUnit = useAppStore((s) => s.bbtUnit);
  const contraceptives = useAppStore((s) => s.contraceptives);
  const contraceptiveLog = useAppStore((s) => s.contraceptiveLog);

  const setDayNote = useAppStore((s) => s.setDayNote);
  const addEntry = useAppStore((s) => s.addEntry);
  const addCustomSymptom = useAppStore((s) => s.addCustomSymptom);

  // ------------------------------------------------------------
  // Export
  // ------------------------------------------------------------

  function openExport() {
    setExportPassword("");
    setExportPasswordConfirm("");
    setExportError(null);
    setExportModalVisible(true);
  }

  async function performExport() {
    setExportError(null);

    if (exportPassword.length < 8) {
      setExportError("Password must be at least 8 characters.");
      return;
    }
    if (exportPassword !== exportPasswordConfirm) {
      setExportError("Passwords don't match.");
      return;
    }

    setBusy("export");
    try {
      const json = await buildEncryptedBackup({
        profileName,
        entries,
        dayNotes,
        customSymptoms,
        bbtUnit,
        contraceptives,
        contraceptiveLog,
        password: exportPassword,
      });

      const safeName = profileName.replace(/\s+/g, "-").toLowerCase();
      const filename = `period-tracker-${safeName}-${todayISO()}.ptbackup`;
      const path = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(path, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: "application/json",
          dialogTitle: "Save your encrypted backup",
          UTI: "public.json",
        });
      } else {
        Alert.alert("Exported", `Saved to ${path}`);
      }

      setExportModalVisible(false);
      setExportPassword("");
      setExportPasswordConfirm("");
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Could not export backup.",
      );
    } finally {
      setBusy(null);
    }
  }

  // ------------------------------------------------------------
  // Import
  // ------------------------------------------------------------

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const fileUri = result.assets[0].uri;

      const raw = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const format = detectBackupFormat(raw);
      setImportFormat(format);
      setPendingImportText(raw);
      setImportPassword("");
      setImportError(null);
      setImportModalVisible(true);
    } catch (err) {
      Alert.alert(
        "Import failed",
        err instanceof Error ? err.message : "Could not read that file.",
      );
    }
  }

  async function performImport() {
    if (!pendingImportText) return;
    setImportError(null);

    try {
      let payload;
      if (importFormat === "encrypted") {
        if (!importPassword) {
          setImportError("Enter the password for this backup.");
          return;
        }
        payload = await decryptEncryptedBackup(
          pendingImportText,
          importPassword,
        );
      } else {
        payload = parseLegacyBackup(pendingImportText);
      }

      // Confirm merge vs replace
      Alert.alert(
        "Import backup",
        `Found ${payload.entries.length} period${
          payload.entries.length === 1 ? "" : "s"
        }.\n\nHow should we import them?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Merge",
            onPress: () => applyImport(payload, "merge"),
          },
          {
            text: "Replace",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Confirm replace",
                "This will delete your current data and replace it with the backup. Continue?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Replace",
                    style: "destructive",
                    onPress: () => applyImport(payload, "replace"),
                  },
                ],
              );
            },
          },
        ],
      );
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Could not decrypt backup.",
      );
    }
  }

  async function applyImport(
    payload: {
      entries: any[];
      dayNotes: any;
      customSymptoms: any[];
      contraceptives: any[];
      contraceptiveLog: any;
    },
    mode: "merge" | "replace",
  ) {
    setImportModalVisible(false);
    setBusy("import");

    try {
      const { saveProfileData } = await import("../lib/storage");
      const profileId = useAppStore.getState().profileId;
      if (!profileId) throw new Error("No active profile.");

      if (mode === "replace") {
        await saveProfileData(profileId, "entries", payload.entries);
        await saveProfileData(profileId, "notes", payload.dayNotes);
        await saveProfileData(
          profileId,
          "customSymptoms",
          payload.customSymptoms,
        );
        await saveProfileData(
          profileId,
          "contraceptives",
          payload.contraceptives,
        );
        await saveProfileData(
          profileId,
          "contraceptiveLog",
          payload.contraceptiveLog,
        );
      } else {
        // Merge mode
        const existingStarts = new Set(entries.map((e) => e.startDate));
        const newEntries = payload.entries.filter(
          (e) => !existingStarts.has(e.startDate),
        );
        await saveProfileData(profileId, "entries", [
          ...entries,
          ...newEntries,
        ]);

        const mergedNotes = { ...dayNotes };
        for (const [iso, rec] of Object.entries(payload.dayNotes)) {
          if (!mergedNotes[iso]) mergedNotes[iso] = rec as any;
        }
        await saveProfileData(profileId, "notes", mergedNotes);

        const existingSymptoms = new Set(
          customSymptoms.map((s) => s.toLowerCase()),
        );
        const newSymptoms = payload.customSymptoms.filter(
          (s) => !existingSymptoms.has(s.toLowerCase()),
        );
        await saveProfileData(profileId, "customSymptoms", [
          ...customSymptoms,
          ...newSymptoms,
        ]);

        const existingContraIds = new Set(contraceptives.map((c) => c.id));
        const newContras = payload.contraceptives.filter(
          (c) => !existingContraIds.has(c.id),
        );
        await saveProfileData(profileId, "contraceptives", [
          ...contraceptives,
          ...newContras,
        ]);

        const mergedLog = { ...contraceptiveLog };
        for (const [iso, obj] of Object.entries(payload.contraceptiveLog)) {
          if (!mergedLog[iso]) mergedLog[iso] = obj as any;
        }
        await saveProfileData(profileId, "contraceptiveLog", mergedLog);
      }

      await useAppStore.getState().loadForProfile(profileId);
      Alert.alert(
        "Import complete",
        mode === "merge" ? "Merged." : "Replaced.",
      );
    } catch (err) {
      Alert.alert(
        "Import failed",
        err instanceof Error ? err.message : "Unknown error.",
      );
    } finally {
      setBusy(null);
      setPendingImportText(null);
      setImportPassword("");
    }
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.title}>Backup</Text>
        <Text style={styles.desc}>
          Export an encrypted backup file. Only your backup password can decrypt
          it — keep it somewhere safe like Google Drive or email.
        </Text>

        <Pressable
          style={[styles.btn, busy === "export" && styles.btnDisabled]}
          onPress={openExport}
          disabled={busy !== null}
        >
          <Text style={styles.btnText}>
            {busy === "export" ? "Exporting…" : "Export encrypted backup"}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.btn,
            styles.btnSecondary,
            busy === "import" && styles.btnDisabled,
          ]}
          onPress={pickFile}
          disabled={busy !== null}
        >
          <Text style={styles.btnSecondaryText}>
            {busy === "import" ? "Importing…" : "Import from file"}
          </Text>
        </Pressable>

        <Text style={styles.note}>
          ⚠ Write your backup password down. If you forget it, the backup cannot
          be restored.
        </Text>
      </View>

      {/* ---------- EXPORT MODAL ---------- */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Encrypt backup</Text>
            <Text style={styles.modalDesc}>
              Choose a password to encrypt this backup. You'll need it to
              restore the backup later.
            </Text>

            <Text style={styles.label}>Backup password</Text>
            <TextInput
              style={styles.input}
              value={exportPassword}
              onChangeText={setExportPassword}
              placeholder="Min 8 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={exportPasswordConfirm}
              onChangeText={setExportPasswordConfirm}
              placeholder="Repeat password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            {exportError && <Text style={styles.error}>{exportError}</Text>}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setExportModalVisible(false)}
                style={styles.cancelBtn}
                disabled={busy !== null}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={performExport}
                style={[
                  styles.saveBtn,
                  busy === "export" && styles.saveBtnDisabled,
                ]}
                disabled={busy !== null}
              >
                <Text style={styles.saveText}>
                  {busy === "export" ? "Exporting…" : "Export"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- IMPORT MODAL ---------- */}
      <Modal
        visible={importModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Import backup</Text>

            {importFormat === "encrypted" ? (
              <>
                <Text style={styles.modalDesc}>
                  This is an encrypted backup. Enter the password you used when
                  you created it.
                </Text>
                <Text style={styles.label}>Backup password</Text>
                <TextInput
                  style={styles.input}
                  value={importPassword}
                  onChangeText={setImportPassword}
                  placeholder="Backup password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            ) : (
              <Text style={styles.modalDesc}>
                This is a legacy plain backup. No password needed — tap Import
                to continue.
              </Text>
            )}

            {importError && <Text style={styles.error}>{importError}</Text>}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setImportModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={performImport} style={styles.saveBtn}>
                <Text style={styles.saveText}>Import</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
      marginBottom: 8,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    btnText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#fff",
    },
    btnSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnSecondaryText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.accentDeep,
    },
    note: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 8,
      lineHeight: 16,
      fontStyle: "italic",
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 16,
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.accentDeep,
    },
    modalDesc: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: 12,
      lineHeight: 18,
    },
    label: {
      fontSize: 13,
      color: colors.textLabel,
      marginTop: 12,
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
    error: {
      marginTop: 12,
      color: colors.danger,
      fontSize: 13,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 20,
    },
    cancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.accentDeep,
    },
    saveBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.accent,
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#fff",
    },
  });
}
