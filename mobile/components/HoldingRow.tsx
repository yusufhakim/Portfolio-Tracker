import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { AssetType, HoldingWithValue } from "@/api/types";
import { colors, formatCurrency, formatPct, gainColor, spacing } from "@/theme";

const TYPE_LABEL: Record<AssetType, string> = {
  us_equity: "US Stock",
  us_etf: "US ETF",
  in_mf: "India MF",
};

interface Props {
  holding: HoldingWithValue;
  baseCurrency: string;
  onDelete: (id: number) => void;
}

export function HoldingRow({ holding, baseCurrency, onDelete }: Props) {
  const confirmDelete = () => {
    Alert.alert("Remove holding", `Remove ${holding.display_name || holding.key}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onDelete(holding.id) },
    ]);
  };

  const priceCcy = holding.price_currency ?? holding.currency;

  return (
    <Pressable style={styles.row} onLongPress={confirmDelete}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <Text style={styles.symbol} numberOfLines={1}>
            {holding.key}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{TYPE_LABEL[holding.asset_type]}</Text>
          </View>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {holding.display_name || "—"}
        </Text>
        <Text style={styles.sub}>
          {holding.quantity} @ {formatCurrency(holding.price, priceCcy)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.value}>
          {formatCurrency(holding.market_value_base, baseCurrency)}
        </Text>
        <Text style={[styles.gain, { color: gainColor(holding.gain_base) }]}>
          {formatCurrency(holding.gain_base, baseCurrency)} ({formatPct(holding.gain_pct)})
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  left: { flex: 1, marginRight: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center" },
  symbol: { color: colors.text, fontSize: 16, fontWeight: "700" },
  badge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: colors.textDim, fontSize: 10, fontWeight: "600" },
  name: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  right: { alignItems: "flex-end" },
  value: { color: colors.text, fontSize: 16, fontWeight: "700" },
  gain: { fontSize: 12, marginTop: 4 },
});
