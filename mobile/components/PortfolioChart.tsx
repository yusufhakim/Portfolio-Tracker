import { useMemo } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import type { HistoryPoint } from "@/api/types";
import { colors, formatCurrency, spacing } from "@/theme";

interface Props {
  points: HistoryPoint[];
  baseCurrency: string;
  loading?: boolean;
}

const HEIGHT = 200;

/**
 * Lightweight area line-chart drawn with react-native-svg (bundled in Expo Go,
 * so no extra native dependencies). Builds a smooth-ish polyline of the
 * portfolio value plus a soft gradient fill beneath it.
 */
export function PortfolioChart({ points, baseCurrency, loading }: Props) {
  const width = Dimensions.get("window").width - spacing.lg * 2;

  const { linePath, areaPath, minVal, maxVal, trendUp } = useMemo(() => {
    if (points.length < 2) {
      return {
        linePath: "",
        areaPath: "",
        minVal: 0,
        maxVal: 0,
        trendUp: true,
      };
    }
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padY = 12;
    const usableH = HEIGHT - padY * 2;
    const stepX = width / (points.length - 1);

    const coords = values.map((v, i) => {
      const x = i * stepX;
      const y = padY + (1 - (v - min) / range) * usableH;
      return [x, y] as const;
    });

    const line = coords
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");
    const area =
      `${line} L${(width).toFixed(2)},${HEIGHT} L0,${HEIGHT} Z`;

    return {
      linePath: line,
      areaPath: area,
      minVal: min,
      maxVal: max,
      trendUp: values[values.length - 1] >= values[0],
    };
  }, [points, width]);

  if (loading) {
    return (
      <View style={[styles.placeholder, { width }]}>
        <Text style={styles.placeholderText}>Loading chart…</Text>
      </View>
    );
  }

  if (points.length < 2) {
    return (
      <View style={[styles.placeholder, { width }]}>
        <Text style={styles.placeholderText}>
          Not enough history yet. Prices fill in as they update.
        </Text>
      </View>
    );
  }

  const lineColor = trendUp ? colors.positive : colors.negative;

  return (
    <View>
      <Svg width={width} height={HEIGHT}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={0.35} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaFill)" />
        <Path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.axisRow}>
        <Text style={styles.axisText}>{formatCurrency(minVal, baseCurrency)}</Text>
        <Text style={styles.axisText}>{formatCurrency(maxVal, baseCurrency)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: HEIGHT,
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
