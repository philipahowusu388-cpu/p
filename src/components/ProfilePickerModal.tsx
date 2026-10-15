import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import type { Profile } from "../types";
import { profileAvatarText } from "../lib/profiles";
import { useTheme } from "../lib/theme";

interface Props {
  visible: boolean;
  profiles: Profile[];
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function ProfilePickerModal({
  visible,
  profiles,
  activeId,
  onClose,
  onSelect,
  onDelete,
  onAdd,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={styles.title}>Profiles</Text>
          <Text style={styles.subtitle}>
            Pick a profile to switch to. Each has its own password.
          </Text>

          <ScrollView style={styles.list}>
            {profiles.map((p) => {
              const isActive = p.id === activeId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => (isActive ? onClose() : onSelect(p.id))}
                  style={[styles.row, isActive && styles.rowActive]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {profileAvatarText(p)}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{p.name}</Text>
                    <Text style={styles.meta}>
                      {isActive ? "Currently active" : "Tap to switch"}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Active</Text>
                    </View>
                  )}
                  {!isActive && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        onDelete(p.id);
                      }}
                      style={styles.removeBtn}
                      hitSlop={8}
                    >
                      <Text style={styles.removeText}>×</Text>
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.btn}>
              <Text style={styles.btnText}>Close</Text>
            </Pressable>
            <Pressable onPress={onAdd} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>+ Add profile</Text>
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
      maxHeight: "80%",
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
      marginBottom: 16,
    },
    list: {
      maxHeight: 320,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      marginBottom: 8,
    },
    rowActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.accentDeep,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    meta: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    removeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    removeText: {
      fontSize: 18,
      color: colors.danger,
      lineHeight: 20,
    },
    actions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 16,
      justifyContent: "flex-end",
    },
    btn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.accentDeep,
    },
    btnPrimary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    btnPrimaryText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#fff",
    },
  });
}
