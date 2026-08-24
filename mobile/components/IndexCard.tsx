import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { ChangeText } from "@/components/ChangeText";
import type { IndexQuote } from "@/services/providers/indices";
import { colors, spacing } from "@/theme";

interface Props {
  quote: IndexQuote;
}

const W = 120;
const H = 36;

function sparklinePath(values: number[]): { path: string; up: boolean } {
  if (values.length < 2) return { path: "", up: true };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = W / (values.length - 1);
  const path = values
    .map((v, i) => {
      const x = i * stepX;
      const y = (1 - (v - min) / range) * H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return { path, up: values[values.length - 1] >= values[0] };
}

export function IndexCard({ quote }: Props) {
  const unavailable = !Number.isFinite(quote.level);
  const { path, up } = sparklinePath(quote.sparkline);
  const lineColor = up ? colors.positive : colors.negative;

  return (
    <View style={styles.card}>
      <Text style={styles.name} numberOfLines={1}>
        {quote.name}
      </Text>
      {unavailable ? (
        <Text style={styles.unavailable}>Unavailable</Text>
      ) : (
        <>
          <Text style={styles.level}>
            {quote.level.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <ChangeText pct={quote.changePct} size={12} />
          {path ? (
            <Svg width={W} height={H} style={styles.spark}>
              <Path
                d={path}
                fill="none"
                stroke={lineColor}
                strokeWidth={1.6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
          ) : (
            <View style={[styles.spark, { height: H }]} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: W + spacing.lg * 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginRight: spacing.sm,
  },
  name: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  level: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 4, marginBottom: 2 },
  unavailable: { color: colors.textDim, fontSize: 13, marginTop: 8, marginBottom: 8 },
  spark: { marginTop: spacing.sm },
});
