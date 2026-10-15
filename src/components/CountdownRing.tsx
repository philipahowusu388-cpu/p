import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../lib/theme";

interface Props {
  daysRemaining: number;
  progress: number;
  overdue: boolean;
}

const SIZE = 180;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CountdownRing({ daysRemaining, progress, overdue }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const displayNum = Math.abs(daysRemaining);
  const displayLabel =
    daysRemaining < 0
      ? "days overdue"
      : daysRemaining === 0
        ? "today!"
        : daysRemaining === 1
          ? "day to go"
          : "days to go";

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const offset = overdue ? 0 : CIRCUMFERENCE * (1 - clampedProgress);

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.borderSoft}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={overdue ? colors.danger : colors.accent}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.num, overdue && styles.overdue]}>
          {displayNum}
        </Text>
        <Text style={styles.label}>{displayLabel}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    wrap: {
      width: SIZE,
      height: SIZE,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
    },
    center: {
      position: "absolute",
      alignItems: "center",
    },
    num: {
      fontSize: 52,
      fontWeight: "800",
      color: colors.accentDeep,
      lineHeight: 56,
    },
    overdue: {
      color: colors.danger,
    },
    label: {
      fontSize: 12,
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: 2,
    },
  });
}
