import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ChangeText } from "@/components/ChangeText";
import type { PortfolioWithValue } from "@/db/types";
import { formatUsd0, spacing, useColors, type Palette } from "@/theme";

interface Props {
  portfolio: PortfolioWithValue;
  onPress: (p: PortfolioWithValue) => void;
}

export function PortfolioRow({ portfolio: p, onPress }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable style={styles.row} onPress={() => onPress(p)}>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>
          {p.name}
        </Text>
        <Text style={styles.sub}>Total value (USD)</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.value}>{formatUsd0(p.value_usd)}</Text>
        <ChangeText pct={p.day_change_pct} size={13} />
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
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
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  sub: { color: colors.textDim, fontSize: 12, marginTop: 3 },
  right: { alignItems: "flex-end" },
  value: { color: colors.text, fontSize: 17, fontWeight: "800", marginBottom: 2 },
});
