import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { useTheme } from "../lib/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
}

export function ChangePasswordModal({ visible, onClose, onSubmit }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPassword("");
      setConfirm("");
      setError(null);
      setBusy(false);
    }
  }, [visible]);

  async function handleSubmit() {
    setError(null);
    if (password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(password);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not change password.",
      );
    } finally {
      setBusy(false);
    }
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
          <Text style={styles.title}>Change password</Text>
          <Text style={styles.subtitle}>
            Your data will be re-encrypted with the new password. This takes a
            few seconds.
          </Text>

          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min 8 characters"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Confirm new password</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          {busy && (
            <Text style={styles.busyNote}>
              Re-encrypting your data… this may take a moment.
            </Text>
          )}

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={styles.cancelBtn}
              disabled={busy}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              style={[styles.saveBtn, busy && styles.saveBtnDisabled]}
              disabled={busy}
            >
              <Text style={styles.saveText}>
                {busy ? "Working…" : "Change password"}
              </Text>
            </Pressable>
          </View>
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
    busyNote: {
      marginTop: 12,
      color: colors.textMuted,
      fontSize: 12,
      fontStyle: "italic",
      textAlign: "center",
    },
    actions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 20,
      justifyContent: "flex-end",
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
