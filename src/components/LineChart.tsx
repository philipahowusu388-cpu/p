import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { useTheme } from "../lib/theme";
import React from "react";

export interface ChartPoint {
  value: number;
  label: string;
}

interface Props {
  points: ChartPoint[];
  height?: number;
  color?: string;
  minValue?: number;
  maxValue?: number;
  ySteps?: number;
  formatY?: (v: number) => string;
  emptyText?: string;
  showXLabels?: boolean;
}

const DEFAULT_HEIGHT = 200;
const CHART_PADDING = { top: 16, right: 12, bottom: 28, left: 40 };

export function LineChart({
  points,
  height = DEFAULT_HEIGHT,
  color,
  minValue,
  maxValue,
  ySteps = 4,
  formatY,
  emptyText = "Not enough data yet",
  showXLabels = true,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const lineColor = color ?? colors.accent;

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  const containerWidth = Dimensions.get("window").width - 64;
  const W = containerWidth;
  const H = height;
  const chartW = W - CHART_PADDING.left - CHART_PADDING.right;
  const chartH = H - CHART_PADDING.top - CHART_PADDING.bottom;

  const values = points.map((p) => p.value);
  const minV = minValue ?? Math.min(...values) - 1;
  const maxV = maxValue ?? Math.max(...values) + 1;

  const xStep = points.length > 1 ? chartW / (points.length - 1) : 0;
  const xOf = (i: number) => CHART_PADDING.left + i * xStep;
  const yOf = (v: number) =>
    CHART_PADDING.top + (1 - (v - minV) / (maxV - minV || 1)) * chartH;

  let pathD = "";
  points.forEach((p, i) => {
    const x = xOf(i);
    const y = yOf(p.value);
    pathD += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        {Array.from({ length: ySteps + 1 }).map((_, i) => {
          const v = minV + ((maxV - minV) * i) / ySteps;
          const y = yOf(v);
          return (
            <React.Fragment key={`grid-${i}`}>
              <Line
                x1={CHART_PADDING.left}
                y1={y}
                x2={W - CHART_PADDING.right}
                y2={y}
                stroke={colors.borderSoft}
                strokeWidth={1}
              />
              <SvgText
                x={CHART_PADDING.left - 6}
                y={y + 4}
                fontSize="10"
                fill={colors.textMuted}
                textAnchor="end"
              >
                {formatY ? formatY(v) : v.toFixed(1)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {points.length > 1 && (
          <Path
            d={pathD}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((p, i) => (
          <Circle
            key={`dot-${i}`}
            cx={xOf(i)}
            cy={yOf(p.value)}
            r={4}
            fill={lineColor}
          />
        ))}

        {showXLabels && points.length > 0 && (
          <>
            <SvgText
              x={CHART_PADDING.left}
              y={H - 8}
              fontSize="10"
              fill={colors.textMuted}
              textAnchor="start"
            >
              {points[0].label}
            </SvgText>
            {points.length > 1 && (
              <SvgText
                x={W - CHART_PADDING.right}
                y={H - 8}
                fontSize="10"
                fill={colors.textMuted}
                textAnchor="end"
              >
                {points[points.length - 1].label}
              </SvgText>
            )}
          </>
        )}
      </Svg>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    empty: {
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });
}
