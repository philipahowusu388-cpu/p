import { useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useAppStore } from "../lib/store";
import {
  scheduleAllNotifications,
  cancelAllNotifications,
  requestNotificationPermission,
} from "../lib/notifications";
import { useTheme } from "../lib/theme";

export function NotificationsCard() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const notifPeriod = useAppStore((s) => s.notifPeriod);
  const notifLog = useAppStore((s) => s.notifLog);
  const notifPill = useAppStore((s) => s.notifPill);
  const setNotifPeriod = useAppStore((s) => s.setNotifPeriod);
  const setNotifLog = useAppStore((s) => s.setNotifLog);
  const setNotifPill = useAppStore((s) => s.setNotifPill);

  const [busy, setBusy] = useState(false);

  async function reschedule() {
    await cancelAllNotifications();
    const state = useAppStore.getState();
    await scheduleAllNotifications({
      entries: state.entries,
      contraceptives: state.contraceptives,
      contraceptiveLog: state.contraceptiveLog,
      notifPeriod: state.notifPeriod,
      notifLog: state.notifLog,
      notifPill: state.notifPill,
    });
  }

  async function toggle(
    setter: (v: boolean) => Promise<void>,
    enabled: boolean
  ) {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        const ok = await requestNotificationPermission();
        if (!ok) {
          Alert.alert(
            "Permission denied",
            "Enable notifications for this app in your device settings to use reminders."
          );
          setBusy(false);
          return;
        }
      }
      await setter(enabled);
      await reschedule();
    } catch (err) {
      Alert.alert(
        "Could not update",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    const ok = await requestNotificationPermission();
    if (!ok) {
      Alert.alert("Permission denied", "Enable notifications to test them.");
      return;
    }
    try {
      await import("expo-notifications").then((N) =>
        N.scheduleNotificationAsync({
          content: {
            title: "🌸 Period Tracker",
            body: "This is a test notification. Reminders are working!",
          },
          trigger: null,
        })
      );
    } catch (err) {
      Alert.alert(
        "Test failed",
        err instanceof Error ? err.message : "Unknown error"
      );
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Reminders</Text>
      <Text style={styles.desc}>
        Get notified about upcoming periods and pill doses. Turn on only what
        you want — everything runs on your device.
      </Text>

      <Row
        label="Remind me 1 day before my predicted period"
        value={notifPeriod}
        onChange={(v) => toggle(setNotifPeriod, v)}
        disabled={busy}
        styles={styles}
        colors={colors}
      />

      <Row
        label="Nudge me when my period is late"
        value={notifLog}
        onChange={(v) => toggle(setNotifLog, v)}
        disabled={busy}
        styles={styles}
        colors={colors}
      />

      <Row
        label="Remind me when a contraceptive dose is due"
        value={notifPill}
        onChange={(v) => toggle(setNotifPill, v)}
        disabled={busy}
        styles={styles}
        colors={colors}
      />

      <Pressable onPress={sendTest} style={styles.testBtn}>
        <Text style={styles.testBtnText}>Send test notification</Text>
      </Pressable>
    </View>
  );
}

function Row({
  label,
  value,
  onChange,
  disabled,
  styles,
  colors,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  styles: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#fff"
      />
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
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
    },
    rowLabel: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    testBtn: {
      marginTop: 14,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center",
    },
    testBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.accentDeep,
    },
  });
}