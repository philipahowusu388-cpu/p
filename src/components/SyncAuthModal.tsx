import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useTheme } from "../lib/theme";
import { signInWithEmail, signUpWithEmail } from "../lib/syncAuth";

type Mode = "choose" | "signin" | "signup";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (userId: string, email: string) => void;
}

export function SyncAuthModal({ visible, onClose, onSuccess }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [mode, setMode] = useState<Mode>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMode("choose");
      setEmail("");
      setPassword("");
      setConfirm("");
      setError(null);
      setBusy(false);
    }
  }, [visible]);

  async function handleSignUp() {
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const result = await signUpWithEmail(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Sign-up failed.");
      return;
    }
    if (result.userId && result.email) {
      onSuccess(result.userId, result.email);
      onClose();
    }
  }

  async function handleSignIn() {
    setError(null);
    setBusy(true);
    const result = await signInWithEmail(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Sign-in failed.");
      return;
    }
    if (result.userId && result.email) {
      onSuccess(result.userId, result.email);
      onClose();
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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {mode === "choose" && (
              <>
                <Text style={styles.title}>Enable cloud sync</Text>
                <Text style={styles.desc}>
                  Your data stays encrypted with your profile password. Sync
                  copies that encrypted data to a private cloud account so you
                  can restore it on another phone.
                </Text>
                <Text style={styles.desc}>
                  We never see your data. Even if the cloud is compromised, your
                  encrypted data is unreadable without your password.
                </Text>

                <Pressable
                  onPress={() => setMode("signup")}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>
                    Create a sync account
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setMode("signin")}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>
                    I already have an account
                  </Text>
                </Pressable>

                <Pressable onPress={onClose} style={styles.linkRow}>
                  <Text style={styles.linkText}>Cancel</Text>
                </Pressable>
              </>
            )}

            {mode === "signup" && (
              <>
                <Text style={styles.title}>Create sync account</Text>
                <Text style={styles.desc}>
                  Use an email and a password for sync. This is separate from
                  your profile password.
                </Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 6 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>Confirm password</Text>
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

                <Pressable
                  onPress={handleSignUp}
                  disabled={busy}
                  style={[styles.primaryBtn, busy && styles.btnDisabled]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Create account</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setMode("choose")}
                  style={styles.linkRow}
                  disabled={busy}
                >
                  <Text style={styles.linkText}>Back</Text>
                </Pressable>
              </>
            )}

            {mode === "signin" && (
              <>
                <Text style={styles.title}>Sign in to sync</Text>
                <Text style={styles.desc}>
                  Enter your sync account credentials.
                </Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  onPress={handleSignIn}
                  disabled={busy}
                  style={[styles.primaryBtn, busy && styles.btnDisabled]}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign in</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => setMode("choose")}
                  style={styles.linkRow}
                  disabled={busy}
                >
                  <Text style={styles.linkText}>Back</Text>
                </Pressable>
              </>
            )}
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
    scrollContent: {
      padding: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.accentDeep,
      marginBottom: 8,
    },
    desc: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 12,
      lineHeight: 19,
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
    primaryBtn: {
      marginTop: 20,
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
    },
    primaryBtnText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
    btnDisabled: {
      opacity: 0.6,
    },
    secondaryBtn: {
      marginTop: 10,
      paddingVertical: 13,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
    },
    secondaryBtnText: {
      color: colors.accentDeep,
      fontSize: 14,
      fontWeight: "600",
    },
    linkRow: {
      marginTop: 16,
      alignItems: "center",
    },
    linkText: {
      color: colors.accentDeep,
      fontSize: 13,
      fontWeight: "600",
    },
  });
}
