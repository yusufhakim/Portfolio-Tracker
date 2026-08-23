import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Transaction } from "@/db/types";
import { colors, formatCurrency, formatQty, isoToDisplay, spacing } from "@/theme";

interface Props {
  tx: Transaction;
  onPress: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
}

export function TransactionRow({ tx, onPress, onDelete }: Props) {
  const isBuy = tx.action === "buy";
  return (
    <View style={styles.row}>
      <Pressable style={styles.main} onPress={() => onPress(tx)}>
        <View style={styles.left}>
          <View style={styles.titleRow}>
            <Text style={styles.symbol}>{tx.key}</Text>
            <View style={[styles.badge, isBuy ? styles.buyBadge : styles.sellBadge]}>
              <Text style={styles.badgeText}>{isBuy ? "Purchase" : "Sale"}</Text>
            </View>
          </View>
          <Text style={styles.sub}>{isoToDisplay(tx.trade_date)} · tap to edit</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.qty}>
            {formatQty(tx.qty)} @ {formatCurrency(tx.price, tx.currency)}
          </Text>
          <Text style={styles.total}>
            {formatCurrency(tx.qty * tx.price, tx.currency)}
          </Text>
        </View>
      </Pressable>
      {onDelete && (
        <Pressable
          style={styles.deleteBtn}
          hitSlop={8}
          onPress={() => onDelete(tx)}
        >
          <Text style={styles.deleteIcon}>🗑</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  main: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  left: { flex: 1, marginRight: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center" },
  symbol: { color: colors.text, fontSize: 15, fontWeight: "700" },
  badge: {
    marginLeft: spacing.sm,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  buyBadge: { backgroundColor: "rgba(46,204,113,0.15)" },
  sellBadge: { backgroundColor: "rgba(255,92,92,0.15)" },
  badgeText: { color: colors.text, fontSize: 10, fontWeight: "700" },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 3 },
  right: { alignItems: "flex-end" },
  qty: { color: colors.textDim, fontSize: 12 },
  total: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 3 },
  deleteBtn: {
    width: 52,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
  },
  deleteIcon: { fontSize: 18 },
});
