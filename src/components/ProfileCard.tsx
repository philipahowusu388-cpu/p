import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Profile } from "../types";
import { profileAvatarText } from "../lib/profiles";
import { useTheme } from "../lib/theme";

interface Props {
  currentProfile: Profile | null;
  onSwitch: () => void;
  onAdd: () => void;
}

export function ProfileCard({ currentProfile, onSwitch, onAdd }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profileAvatarText(currentProfile)}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>
            {currentProfile?.name ?? "No profile"}
          </Text>
          <Text style={styles.meta}>
            {currentProfile
              ? "Data encrypted with your password"
              : "No active profile"}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onSwitch} style={styles.btn}>
          <Text style={styles.btnText}>Switch profile</Text>
        </Pressable>
        <Pressable onPress={onAdd} style={styles.btn}>
          <Text style={styles.btnText}>+ Add profile</Text>
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
      marginBottom: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.accentDeep,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    meta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    actions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
    },
    btn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center",
    },
    btnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.accentDeep,
    },
  });
}
