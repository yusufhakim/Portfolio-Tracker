import { Pressable, StyleSheet, Text, View } from "react-native";

import { ChangeText } from "@/components/ChangeText";
import type { AssetType, Holding } from "@/db/types";
import {
  colors,
  formatCurrency,
  formatQty,
  formatSignedCurrency,
  gainColor,
  spacing,
} from "@/theme";

const TYPE_LABEL: Record<AssetType, string> = {
  us_equity: "US Stock",
  us_etf: "US ETF",
  in_mf: "India MF",
};

interface Props {
  holding: Holding;
  onPress: (h: Holding) => void;
}

export function HoldingRow({ holding: h, onPress }: Props) {
  const ccy = h.currency;
  return (
    <Pressable style={styles.row} onPress={() => onPress(h)}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <Text style={styles.symbol} numberOfLines={1}>
            {h.key}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{TYPE_LABEL[h.asset_type]}</Text>
          </View>
        </View>
        <Text style={styles.sub}>{formatQty(h.qty)} @ {formatCurrency(h.price, ccy)}</Text>
        <View style={styles.dayRow}>
          <Text style={[styles.day, { color: gainColor(h.day_change) }]}>
            Today {formatSignedCurrency(h.day_change, ccy)}{"  "}
          </Text>
          <ChangeText pct={h.day_change_pct} size={12} />
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.value}>{formatCurrency(h.market_value, ccy)}</Text>
        <View style={styles.gainRow}>
          <Text style={[styles.gain, { color: gainColor(h.gain) }]}>
            {formatSignedCurrency(h.gain, ccy)}{"  "}
          </Text>
          <ChangeText pct={h.gain_pct} size={12} />
        </View>
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
  symbol: { color: colors.text, fontSize: 16, fontWeight: "700", flexShrink: 1 },
  badge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: colors.textDim, fontSize: 10, fontWeight: "600" },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 3 },
  dayRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  day: { fontSize: 12 },
  right: { alignItems: "flex-end" },
  value: { color: colors.text, fontSize: 16, fontWeight: "700" },
  gainRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  gain: { fontSize: 12 },
});
