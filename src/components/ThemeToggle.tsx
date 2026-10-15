import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme, type ThemePreference } from "../lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "auto", label: "Auto", icon: "🌗" },
  { value: "dark", label: "Dark", icon: "🌙" },
];

export function ThemeToggle() {
  const { colors, preference, setPreference } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.accentDeep }]}>
        Appearance
      </Text>
      <Text style={[styles.desc, { color: colors.textMuted }]}>
        Choose how the app looks. Auto follows your phone's setting.
      </Text>

      <View
        style={[
          styles.row,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}
      >
        {OPTIONS.map((opt) => {
          const active = preference === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setPreference(opt.value)}
              style={[
                styles.segment,
                active && { backgroundColor: colors.accent },
              ]}
            >
              <Text style={styles.icon}>{opt.icon}</Text>
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? "#fff" : colors.textLabel },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  desc: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 17,
  },
  row: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
  },
  icon: {
    fontSize: 15,
  },
});
