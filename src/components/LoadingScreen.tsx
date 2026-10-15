import { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Easing } from "react-native";
import { useTheme } from "../lib/theme";

interface Props {
  message?: string;
}

export function LoadingScreen({ message }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const pulse = useRef(new Animated.Value(0.85)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse, fade]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconWrap,
          { opacity: fade, transform: [{ scale: pulse }] },
        ]}
      >
        <Text style={styles.icon}>🌸</Text>
      </Animated.View>

      <Animated.Text style={[styles.title, { opacity: fade }]}>
        Period Tracker
      </Animated.Text>

      {message ? (
        <Text style={styles.message}>{message}</Text>
      ) : (
        <Text style={styles.message}>Loading…</Text>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
      padding: 32,
    },
    iconWrap: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    icon: {
      fontSize: 56,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.accentDeep,
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
  });
}
