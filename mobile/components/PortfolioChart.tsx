import { useMemo } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import type { PortfolioHistoryPoint, RangeKey } from "@/db/types";
import { currencySymbol, spacing, useColors } from "@/theme";

interface Props {
  points: PortfolioHistoryPoint[];
  /** Display currency ("USD" | "INR" | "AED"). */
  currency: string;
  /** Multiply each point's USD value by this to show it in `currency`. */
  fxFactor: number;
  /** Selected time range — drives the x-axis label style. */
  range: RangeKey;
  /** Previous-close portfolio value in USD (drawn as a dotted reference line). */
  prevCloseUsd?: number | null;
  loading?: boolean;
}

const HEIGHT = 200; // total svg height
const PAD_LEFT = 54; // gutter for y-axis ($) labels
const PAD_BOTTOM = 20; // gutter for x-axis (time) labels
const PAD_TOP = 10;

/** Compact money for axis ticks, e.g. "$117k", "₹9.7M", "D4,200". */
function compactMoney(v: number, ccy: string): string {
  const sym = currencySymbol(ccy);
  const abs = Math.abs(v);
  if (abs >= 1e7) return `${sym}${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e6) return `${sym}${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e4) return `${sym}${Math.round(v / 1e3)}k`;
  if (abs >= 1e3) return `${sym}${(v / 1e3).toFixed(1)}k`;
  return `${sym}${Math.round(v)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a timestamp for the x-axis according to the selected range. */
function fmtTime(ts: string, range: RangeKey): string {
  if (range === "1D") {
    // Intraday: show the time in UAE (Asia/Dubai = UTC+4, no DST).
    const d = new Date(new Date(ts).getTime() + 4 * 3600 * 1000);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }
  const d = new Date(ts);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(2);
  if (range === "1W" || range === "1M") return `${dd}/${mm}`;
  return `${MONTHS[d.getUTCMonth()]} ${yy}`; // 3M / 1Y / 5Y / MAX
}

/**
 * Area line-chart drawn with react-native-svg, with a dynamic **y-axis** ($/₹/D
 * value ticks that rescale as the portfolio value changes) and a dynamic
 * **x-axis** (time labels that follow the selected 1D…ALL range).
 */
export function PortfolioChart({
  points,
  currency,
  fxFactor,
  range,
  prevCloseUsd,
  loading,
}: Props) {
  const colors = useColors();
  const width = Dimensions.get("window").width - spacing.lg * 2;
  const plotW = width - PAD_LEFT;
  const plotH = HEIGHT - PAD_BOTTOM - PAD_TOP;

  const model = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.value * fxFactor);
    const prev =
      prevCloseUsd != null && Number.isFinite(prevCloseUsd) ? prevCloseUsd * fxFactor : null;
    // Include the prev-close in the domain so its dotted line is always visible.
    const domain = prev != null ? [...values, prev] : values;
    const min = Math.min(...domain);
    const max = Math.max(...domain);
    const span = max - min || 1;
    const stepX = plotW / (points.length - 1);
    const yOf = (v: number) => PAD_TOP + (1 - (v - min) / span) * plotH;

    const coords = values.map((v, i) => {
      const x = PAD_LEFT + i * stepX;
      return [x, yOf(v)] as const;
    });
    const line = coords
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");
    const baseY = PAD_TOP + plotH;
    const area = `${line} L${(PAD_LEFT + plotW).toFixed(2)},${baseY} L${PAD_LEFT},${baseY} Z`;

    const yTicks = [0, 0.5, 1].map((f) => ({
      y: PAD_TOP + f * plotH,
      value: max - f * (max - min),
    }));

    // Pick how many x labels actually fit (≈70px each), then space them evenly
    // and DEDUPE — so a portfolio with only 2–3 history points doesn't stack
    // several labels on top of each other.
    const n = points.length;
    const maxLabels = Math.max(2, Math.min(5, Math.floor(plotW / 70)));
    const count = Math.min(maxLabels, n);
    const rawIdx =
      count <= 1 ? [0] : Array.from({ length: count }, (_, k) => Math.round((k * (n - 1)) / (count - 1)));
    const xIdx = [...new Set(rawIdx)];
    const xTicks = xIdx.map((i) => ({
      x: PAD_LEFT + i * stepX,
      label: fmtTime(points[i].ts, range),
      first: i === 0,
      last: i === n - 1,
    }));

    const prevLine =
      prev != null ? { y: yOf(prev), value: prev } : null;

    return {
      line,
      area,
      yTicks,
      xTicks,
      prevLine,
      trendUp: values[values.length - 1] >= values[0],
    };
  }, [points, fxFactor, range, prevCloseUsd, plotW, plotH]);

  if (loading || !model) {
    return (
      <View style={[styles.placeholder, { width, backgroundColor: colors.surface }]}>
        <Text style={[styles.placeholderText, { color: colors.textDim }]}>
          {loading ? "Loading chart…" : "Not enough history yet. Prices fill in as they update."}
        </Text>
      </View>
    );
  }

  const lineColor = model.trendUp ? colors.positive : colors.negative;

  return (
    <Svg width={width} height={HEIGHT}>
      <Defs>
        <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={lineColor} stopOpacity={0.32} />
          <Stop offset="1" stopColor={lineColor} stopOpacity={0.02} />
        </LinearGradient>
      </Defs>

      {/* gridlines + y-axis (value) labels */}
      {model.yTicks.map((t, i) => (
        <Line
          key={`grid-${i}`}
          x1={PAD_LEFT}
          y1={t.y}
          x2={width}
          y2={t.y}
          stroke={colors.border}
          strokeWidth={1}
        />
      ))}
      {model.yTicks.map((t, i) => (
        <SvgText
          key={`yl-${i}`}
          x={PAD_LEFT - 6}
          y={t.y + 3}
          fontSize={9}
          fill={colors.textDim}
          textAnchor="end"
        >
          {compactMoney(t.value, currency)}
        </SvgText>
      ))}

      <Path d={model.area} fill="url(#areaFill)" />
      <Path
        d={model.line}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* previous-close dotted reference line + label (in the chosen currency) */}
      {model.prevLine && (
        <>
          <Line
            x1={PAD_LEFT}
            y1={model.prevLine.y}
            x2={width}
            y2={model.prevLine.y}
            stroke={colors.textDim}
            strokeWidth={1}
            strokeDasharray="2 4"
            strokeLinecap="round"
          />
          <SvgText
            x={width}
            y={Math.max(model.prevLine.y - 4, PAD_TOP + 8)}
            fontSize={9}
            fill={colors.textDim}
            textAnchor="end"
          >
            {`Prev close ${currencySymbol(currency)}${Math.round(model.prevLine.value).toLocaleString()}`}
          </SvgText>
        </>
      )}

      {/* x-axis (time) labels — evenly spaced, edge-anchored so none clip */}
      {model.xTicks.map((t, i) => (
        <SvgText
          key={`xl-${i}`}
          x={Math.min(Math.max(t.x, PAD_LEFT), width)}
          y={HEIGHT - 5}
          fontSize={9}
          fill={colors.textDim}
          textAnchor={t.first ? "start" : t.last ? "end" : "middle"}
        >
          {t.label}
        </SvgText>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
  },
  placeholderText: { textAlign: "center" },
});
