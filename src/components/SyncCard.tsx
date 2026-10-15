import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../lib/theme";
import { SyncAuthModal } from "./SyncAuthModal";
import { getSession, signOut } from "../lib/syncAuth";
import { forcePush, syncOnLaunch } from "../lib/syncOrchestrator";

type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export function SyncCard() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    const { userId, email } = await getSession();
    setUserId(userId);
    setEmail(email);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  async function handleSyncNow() {
    if (syncStatus === "syncing") return;
    setSyncStatus("syncing");
    setErrorMessage(null);
    try {
      const result = await forcePush();
      if (result.ok) {
        setSyncStatus("synced");
        setLastSyncAt(new Date());
      } else {
        setSyncStatus("error");
        setErrorMessage(result.error ?? "Sync failed.");
      }
    } catch (err) {
      setSyncStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Sync failed.");
    }
  }

  async function handleSignOut() {
    Alert.alert(
      "Sign out of sync?",
      "Your local data stays on this phone. Cloud sync will stop until you sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            await refreshSession();
            setSyncStatus("idle");
            setLastSyncAt(null);
          },
        },
      ],
    );
  }

  function statusLabel(): string {
    if (syncStatus === "syncing") return "Syncing…";
    if (syncStatus === "synced" && lastSyncAt) {
      return `Last synced ${relativeTime(lastSyncAt)}`;
    }
    if (syncStatus === "error") return "Sync error";
    return "Ready";
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Cloud sync</Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.title}>Cloud sync</Text>

        {!userId ? (
          <>
            <Text style={styles.desc}>
              Optional. Copy your encrypted data to a private cloud account so
              you can restore it on another phone. We never see your data —
              everything stays encrypted with your profile password.
            </Text>
            <Pressable
              onPress={() => setAuthModalVisible(true)}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Enable cloud sync</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.desc}>
              Your encrypted data is backed up to the cloud automatically.
            </Text>

            <View style={styles.statusRow}>
              <View
                style={[
                  styles.dot,
                  syncStatus === "synced" && styles.dotSynced,
                  syncStatus === "error" && styles.dotError,
                  syncStatus === "syncing" && styles.dotSyncing,
                ]}
              />
              <View style={styles.statusTextWrap}>
                <Text style={styles.statusText}>{email}</Text>
                <Text style={styles.statusSub}>{statusLabel()}</Text>
              </View>
            </View>

            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <Pressable
              onPress={handleSyncNow}
              disabled={syncStatus === "syncing"}
              style={[
                styles.primaryBtn,
                syncStatus === "syncing" && styles.btnDisabled,
              ]}
            >
              {syncStatus === "syncing" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Sync now</Text>
              )}
            </Pressable>

            <Pressable onPress={handleSignOut} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Sign out of sync</Text>
            </Pressable>
          </>
        )}
      </View>

      <SyncAuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={async (uid, mail) => {
          setUserId(uid);
          setEmail(mail);
          // Immediately kick off an initial sync
          try {
            setSyncStatus("syncing");
            await syncOnLaunch();
            setSyncStatus("synced");
            setLastSyncAt(new Date());
          } catch {
            setSyncStatus("error");
          }
        }}
      />
    </>
  );
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
      marginBottom: 8,
    },
    desc: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
      marginBottom: 14,
    },
    primaryBtn: {
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      marginBottom: 8,
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
      paddingVertical: 12,
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
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      marginBottom: 12,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.textMuted,
    },
    dotSynced: {
      backgroundColor: colors.ovulation,
    },
    dotError: {
      backgroundColor: colors.danger,
    },
    dotSyncing: {
      backgroundColor: "#f5a962",
    },
    statusTextWrap: {
      flex: 1,
    },
    statusText: {
      fontSize: 13,
      color: colors.text,
    },
    statusSub: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    errorText: {
      fontSize: 12,
      color: colors.danger,
      marginBottom: 10,
    },
  });
}
