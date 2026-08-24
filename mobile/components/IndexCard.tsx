import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from "react-native-svg";

import type { IndexQuote } from "@/services/providers/indices";
import { spacing, useColors, type Palette } from "@/theme";

interface Props {
  quote: IndexQuote;
}

const SPARK_H = 40; // sparkline height
const DOT_GAP = 12; // vertical space above the sparkline (holds the dotted separator)

function buildSpark(values: number[], width: number) {
  if (values.length < 2 || width <= 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const pad = 4;
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = pad + (1 - (v - min) / span) * (SPARK_H - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width.toFixed(1)},${SPARK_H} L0,${SPARK_H} Z`;
  const [ex, ey] = pts[pts.length - 1];
  return { line, area, ex, ey };
}

export function IndexCard({ quote }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [w, setW] = useState(0);

  const unavailable = !Number.isFinite(quote.level);
  const pct = quote.changePct;
  // Colour EVERYTHING (number, arrow badge, sparkline) by the day's % change, so
  // the sparkline can never disagree with the sign shown above it.
  const down = pct != null && pct < 0;
  const trend = pct == null ? colors.textDim : down ? colors.negative : colors.positive;
  const gid = `spark-${quote.symbol.replace(/[^a-z0-9]/gi, "")}`;
  const spark = buildSpark(quote.sparkline, w);

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
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>

          <View style={styles.pctRow}>
            <Text style={[styles.pct, { color: trend }]} numberOfLines={1}>
              {pct == null ? "—" : `${pct >= 0 ? "+" : "-"}${Math.abs(pct).toFixed(2)}%`}
            </Text>
            {pct != null && (
              <View style={[styles.badge, { backgroundColor: trend }]}>
                <Text style={styles.badgeArrow}>{down ? "↓" : "↑"}</Text>
              </View>
            )}
          </View>

          <View style={styles.lower} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
            {w > 0 && (
              <Svg width={w} height={SPARK_H + DOT_GAP}>
                <Defs>
                  <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={trend} stopOpacity={0.22} />
                    <Stop offset="1" stopColor={trend} stopOpacity={0.02} />
                  </LinearGradient>
                </Defs>
                {/* dotted separator */}
                <Line
                  x1="0"
                  y1={5}
                  x2={w}
                  y2={5}
                  stroke={colors.border}
                  strokeWidth={1.5}
                  strokeDasharray="0.5 5"
                  strokeLinecap="round"
                />
                {spark && (
                  <G transform={`translate(0, ${DOT_GAP})`}>
                    <Path d={spark.area} fill={`url(#${gid})`} />
                    <Path
                      d={spark.line}
                      fill="none"
                      stroke={trend}
                      strokeWidth={1.8}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <Circle cx={spark.ex} cy={spark.ey} r={2.8} fill={trend} />
                  </G>
                )}
              </Svg>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: 3,
    minWidth: 0,
  },
  name: { color: colors.text, fontSize: 13, fontWeight: "800" },
  level: { color: colors.textDim, fontSize: 15, fontWeight: "700", marginTop: 4 },
  unavailable: { color: colors.textDim, fontSize: 12, marginTop: 8, marginBottom: 8 },
  pctRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  pct: { fontSize: 12, fontWeight: "800", flexShrink: 1 },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 5,
  },
  badgeArrow: { color: "#fff", fontSize: 11, fontWeight: "900", lineHeight: 13 },
  lower: { marginTop: spacing.sm },
});
