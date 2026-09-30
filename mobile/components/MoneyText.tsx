import { StyleSheet, Text, View, type TextStyle } from "react-native";

import { DirhamGlyph } from "@/components/DirhamGlyph";
import { currencySymbol, useColors } from "@/theme";

interface Props {
  value: number | null | undefined;
  currency: string;
  /** Decimal places (default 2; portfolio values use 0). */
  decimals?: number;
  /** Prefix a +/- sign (before the symbol). */
  signed?: boolean;
  /** Text style for the number/symbol. */
  style?: TextStyle;
  /** Colour override for both symbol and number. */
  color?: string;
}

/**
 * A money amount rendered with its currency symbol. For AED the symbol is the
 * new Dirham glyph (an inline vector that scales with the font and takes the
 * colour); for USD/INR it's the normal "$"/"₹" text. Layout: [sign][symbol][number].
 */
export function MoneyText({ value, currency, decimals = 2, signed = false, style, color }: Props) {
  const colors = useColors();
  const col = color ?? (style?.color as string) ?? colors.text;
  const fontSize = (style?.fontSize as number) ?? 14;
  const textStyle = [style, { color: col }];

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <Text style={textStyle}>—</Text>;
  }

  const abs = Math.abs(value);
  const num = abs.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const sign = signed ? (value < 0 ? "-" : "+") : "";
  const isAed = currency.toUpperCase() === "AED";

  return (
    <View style={styles.row}>
      {sign ? <Text style={textStyle}>{sign}</Text> : null}
      {isAed ? (
        <DirhamGlyph size={fontSize * 0.82} color={col} style={{ marginRight: fontSize * 0.06 }} />
      ) : (
        <Text style={textStyle}>{currencySymbol(currency)}</Text>
      )}
      <Text style={textStyle}>{num}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
});
