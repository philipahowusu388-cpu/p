import { View, Text, Pressable, StyleSheet } from "react-native";
import type { PeriodEntry, DayNotesMap } from "../types";
import {
  computePredictions,
  averagePeriodLength,
  getSortedEntries,
} from "../lib/domain/predictions";
import { parseDate, toISO, addDays } from "../lib/utils/dates";
import { useTheme } from "../lib/theme";

interface Props {
  year: number;
  month: number;
  entries: PeriodEntry[];
  dayNotes: DayNotesMap;
  onDayPress: (iso: string) => void;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface DayFlags {
  period: boolean;
  predicted: boolean;
  fertile: boolean;
  ovulation: boolean;
  hasNote: boolean;
  hasBBT: boolean;
}

export function CalendarGrid({
  year,
  month,
  entries,
  dayNotes,
  onDayPress,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const flags = buildDayFlags(entries);

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayIso = toISO(new Date());

  const cells: Array<{ day: number; iso: string } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toISO(new Date(year, month, day));
    cells.push({ day, iso });
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {MONTH_NAMES[month]} {year}
        </Text>
      </View>

      <View style={styles.weekRow}>
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={styles.cell}>
            <Text style={styles.weekLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, i) => {
          if (!cell) {
            return <View key={`empty-${i}`} style={styles.cell} />;
          }

          const f = flags.get(cell.iso);
          const isToday = cell.iso === todayIso;
          const rec = dayNotes[cell.iso];

          return (
            <Pressable
              key={cell.iso}
              onPress={() => onDayPress(cell.iso)}
              style={[
                styles.cell,
                styles.dayCell,
                f?.period && styles.periodCell,
                !f?.period && f?.predicted && styles.predictedCell,
                !f?.period && f?.fertile && styles.fertileCell,
                f?.ovulation && styles.ovulationCell,
                isToday && styles.todayCell,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  f?.period && styles.dayTextOnDark,
                  f?.ovulation && styles.dayTextOnDark,
                ]}
              >
                {cell.day}
              </Text>

              {rec?.note ? <View style={styles.noteDot} /> : null}
              {rec?.bbt != null ? <View style={styles.bbtDot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendDot color={colors.accent} label="Period" styles={styles} />
        <LegendDot
          color={colors.accentSoft}
          label="Predicted"
          styles={styles}
        />
        <LegendDot color={colors.fertile} label="Fertile" styles={styles} />
        <LegendDot color={colors.ovulation} label="Ovulation" styles={styles} />
        <LegendDot color={colors.note} label="Note" styles={styles} />
      </View>
    </View>
  );
}

function LegendDot({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function buildDayFlags(entries: PeriodEntry[]): Map<string, DayFlags> {
  const map = new Map<string, DayFlags>();

  function ensure(iso: string): DayFlags {
    let f = map.get(iso);
    if (!f) {
      f = {
        period: false,
        predicted: false,
        fertile: false,
        ovulation: false,
        hasNote: false,
        hasBBT: false,
      };
      map.set(iso, f);
    }
    return f;
  }

  const sorted = getSortedEntries(entries);

  const avgLen = averagePeriodLength(sorted);
  for (const e of sorted) {
    const start = parseDate(e.startDate);
    const end = e.endDate ? parseDate(e.endDate) : addDays(start, avgLen - 1);
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      ensure(toISO(d)).period = true;
    }
  }

  const predictions = computePredictions(entries);
  if (predictions) {
    for (
      let d = new Date(predictions.nextStart);
      d <= predictions.nextEnd;
      d = addDays(d, 1)
    ) {
      ensure(toISO(d)).predicted = true;
    }
    for (
      let d = new Date(predictions.fertileStart);
      d <= predictions.fertileEnd;
      d = addDays(d, 1)
    ) {
      ensure(toISO(d)).fertile = true;
    }
    ensure(toISO(predictions.ovulation)).ovulation = true;
  }

  return map;
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
    },
    header: {
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.accentDeep,
    },
    weekRow: {
      flexDirection: "row",
      marginBottom: 4,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    dayCell: {
      borderRadius: 8,
    },
    periodCell: {
      backgroundColor: colors.accent,
    },
    predictedCell: {
      backgroundColor: colors.accentSoft,
    },
    fertileCell: {
      backgroundColor: colors.fertile,
    },
    ovulationCell: {
      backgroundColor: colors.ovulation,
    },
    todayCell: {
      borderWidth: 2,
      borderColor: colors.accentDeep,
    },
    weekLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.accentDeep,
    },
    dayText: {
      fontSize: 13,
      color: colors.text,
    },
    dayTextOnDark: {
      color: "#fff",
      fontWeight: "700",
    },
    noteDot: {
      position: "absolute",
      bottom: 3,
      right: 5,
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.note,
    },
    bbtDot: {
      position: "absolute",
      bottom: 3,
      left: 5,
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.ovulation,
    },
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 12,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 11,
      color: colors.textLabel,
    },
  });
}
