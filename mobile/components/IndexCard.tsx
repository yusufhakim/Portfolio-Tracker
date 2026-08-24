import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { ChangeText } from "@/components/ChangeText";
import type { IndexQuote } from "@/services/providers/indices";
import { spacing, useColors, type Palette } from "@/theme";

interface Props {
  quote: IndexQuote;
}

// The sparkline is drawn in a 100×28 viewBox and scaled to the card width, so
// the card can flex to 1/3 of the screen without a fixed pixel width.
const VBW = 100;
const VBH = 28;

function sparklinePath(values: number[]): { path: string; up: boolean } {
  if (values.length < 2) return { path: "", up: true };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = VBW / (values.length - 1);
  const path = values
    .map((v, i) => {
      const x = i * stepX;
      const y = (1 - (v - min) / range) * VBH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return { path, up: values[values.length - 1] >= values[0] };
}

export function IndexCard({ quote }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
          <Text style={styles.level} numberOfLines={1} adjustsFontSizeToFit>
            {quote.level.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </Text>
          <ChangeText pct={quote.changePct} size={11} />
          {path ? (
            <Svg
              width="100%"
              height={VBH}
              viewBox={`0 0 ${VBW} ${VBH}`}
              preserveAspectRatio="none"
              style={styles.spark}
            >
              <Path
                d={path}
                fill="none"
                stroke={lineColor}
                strokeWidth={1.4}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
          ) : (
            <View style={[styles.spark, { height: VBH }]} />
          )}
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginHorizontal: 3,
    minWidth: 0,
  },
  name: { color: colors.textDim, fontSize: 11, fontWeight: "600" },
  level: { color: colors.text, fontSize: 15, fontWeight: "800", marginTop: 2, marginBottom: 1 },
  unavailable: { color: colors.textDim, fontSize: 12, marginTop: 6, marginBottom: 6 },
  spark: { marginTop: spacing.xs },
});
