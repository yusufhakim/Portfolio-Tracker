import { useMemo } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import type { HistoryPoint } from "@/api/types";
import { colors, formatCurrency, spacing } from "@/theme";

interface Props {
  points: HistoryPoint[];
  baseCurrency: string;
  loading?: boolean;
}

export function PortfolioChart({ points, baseCurrency, loading }: Props) {
  const width = Dimensions.get("window").width - spacing.lg * 2;

  const data = useMemo(
    () => points.map((p) => ({ value: p.value })),
    [points],
  );

  const trendUp = useMemo(() => {
    if (points.length < 2) return true;
    return points[points.length - 1].value >= points[0].value;
  }, [points]);

  if (loading) {
    return (
      <View style={[styles.placeholder, { width }]}>
        <Text style={styles.placeholderText}>Loading chart…</Text>
      </View>
    );
  }

  if (data.length < 2) {
    return (
      <View style={[styles.placeholder, { width }]}>
        <Text style={styles.placeholderText}>
          Not enough history yet. Prices fill in as they update.
        </Text>
      </View>
    );
  }

  const lineColor = trendUp ? colors.positive : colors.negative;
  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  return (
    <View>
      <LineChart
        areaChart
        data={data}
        width={width}
        height={200}
        initialSpacing={0}
        endSpacing={0}
        thickness={2}
        color={lineColor}
        startFillColor={lineColor}
        endFillColor={colors.bg}
        startOpacity={0.35}
        endOpacity={0.02}
        hideDataPoints
        hideRules
        hideYAxisText
        yAxisThickness={0}
        xAxisThickness={0}
        adjustToWidth
        curved
      />
      <View style={styles.axisRow}>
        <Text style={styles.axisText}>{formatCurrency(minVal, baseCurrency)}</Text>
        <Text style={styles.axisText}>{formatCurrency(maxVal, baseCurrency)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
  },
  placeholderText: {
    color: colors.textDim,
    textAlign: "center",
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  axisText: {
    color: colors.textDim,
    fontSize: 11,
  },
});
