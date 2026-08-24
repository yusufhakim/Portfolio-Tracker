import { StyleSheet, Text, type TextStyle } from "react-native";

import { colors } from "@/theme";

interface Props {
  /** The percentage change (already ×100). Null renders a dim "—". */
  pct: number | null | undefined;
  size?: number;
  style?: TextStyle;
}

/**
 * Signed percentage change with a colored directional arrow:
 * green ▲ when ≥ 0, red ▼ when < 0. Percentage shown to 2 decimals.
 * Reused by IndexCard, PortfolioRow, HoldingRow and TransactionRow.
 */
export function ChangeText({ pct, size = 13, style }: Props) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) {
    return <Text style={[styles.base, { fontSize: size, color: colors.textDim }, style]}>—</Text>;
  }
  const up = pct >= 0;
  const color = up ? colors.positive : colors.negative;
  const arrow = up ? "▲" : "▼";
  const sign = up ? "+" : "-";
  return (
    <Text style={[styles.base, { fontSize: size, color }, style]}>
      {arrow} {sign}
      {Math.abs(pct).toFixed(2)}%
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { fontWeight: "700" },
});
