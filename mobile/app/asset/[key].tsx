import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TransactionRow } from "@/components/TransactionRow";
import { confirmDeleteTransaction } from "@/components/confirmDeleteTransaction";
import type { AssetType, Holding } from "@/db/types";
import { useAssetDetail, useDeleteAsset, useDeleteTransaction, usePortfolio } from "@/hooks/data";
import {
  formatCurrency,
  formatPct,
  formatQty,
  formatSignedCurrency,
  gainColor,
  spacing,
  useColors,
  type Palette,
} from "@/theme";

export default function AssetDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    key: string;
    assetType: string;
    name: string;
    currency: string;
    portfolioId: string;
  }>();
  const assetType = params.assetType as AssetType;
  const key = params.key;
  const currency = params.currency;
  const portfolioId = Number(params.portfolioId);

  const detail = useAssetDetail(portfolioId, assetType, key);
  const portfolio = usePortfolio(portfolioId);
  const deleteTx = useDeleteTransaction();
  const deleteAsset = useDeleteAsset();

  const holding: Holding | undefined = portfolio.data?.holdings.find(
    (h) => h.asset_type === assetType && h.key === key,
  );
  const qty = detail.data?.qty ?? 0;

  const confirmDeleteAsset = () => {
    Alert.alert(
      "Delete this holding?",
      `This removes ${params.name || key} and ALL its transactions. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteAsset.mutate(
              { portfolioId, assetType, key },
              { onSuccess: () => router.back() },
            ),
        },
      ],
    );
  };

  if (detail.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const header = (
    <View>
      <Text style={styles.symbol}>{key}</Text>
      <Text style={styles.name}>{params.name}</Text>

      <View style={styles.card}>
        <Row label="Quantity held" value={formatQty(qty)} />
        <Row label="Avg cost" value={formatCurrency(holding?.avg_cost ?? null, currency)} />
        <Row label="Current price" value={formatCurrency(holding?.price ?? null, currency)} />
        <Row label="Market value" value={formatCurrency(holding?.market_value ?? null, currency)} />
        <Row
          label="Today"
          value={`${formatSignedCurrency(holding?.day_change ?? null, currency)} (${formatPct(
            holding?.day_change_pct ?? null,
          )})`}
          color={gainColor(holding?.day_change ?? null)}
        />
        <Row
          label="Total gain/loss"
          value={`${formatSignedCurrency(holding?.gain ?? null, currency)} (${formatPct(
            holding?.gain_pct ?? null,
          )})`}
          color={gainColor(holding?.gain ?? null)}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, styles.buyBtn]}
          onPress={() =>
            router.push({
              pathname: "/trade",
              params: {
                assetType, key, name: params.name, currency,
                action: "buy", portfolioId: String(portfolioId),
              },
            })
          }
        >
          <Text style={styles.actionText}>Buy more</Text>
        </Pressable>
        {qty > 0 && (
          <Pressable
            style={[styles.actionBtn, styles.sellBtn]}
            onPress={() =>
              router.push({
                pathname: "/trade",
                params: {
                  assetType, key, name: params.name, currency,
                  action: "sell", maxQty: String(qty),
                  portfolioId: String(portfolioId),
                },
              })
            }
          >
            <Text style={styles.actionText}>Sell</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.sectionTitle}>Transactions</Text>
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      data={detail.data?.txns ?? []}
      keyExtractor={(t) => `tx-${t.id}`}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <TransactionRow
          tx={item}
          onPress={(t) =>
            router.push({ pathname: "/transaction/[id]", params: { id: String(t.id) } })
          }
          onDelete={(t) => confirmDeleteTransaction(t, () => deleteTx.mutate(t.id))}
        />
      )}
      ListFooterComponent={
        <Pressable style={styles.deleteBtn} onPress={confirmDeleteAsset}>
          <Text style={styles.deleteText}>Delete entire holding</Text>
        </Pressable>
      }
    />
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={rowStyles.kvRow}>
      <Text style={[rowStyles.kvLabel, { color: colors.textDim }]}>{label}</Text>
      <Text style={[rowStyles.kvValue, { color: color ?? colors.text }]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  kvRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  kvLabel: { fontSize: 14 },
  kvValue: { fontSize: 14, fontWeight: "600" },
});

const makeStyles = (colors: Palette) => StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  symbol: { color: colors.text, fontSize: 24, fontWeight: "800" },
  name: { color: colors.textDim, fontSize: 14, marginTop: 2, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  kvLabel: { color: colors.textDim, fontSize: 14 },
  kvValue: { color: colors.text, fontSize: 14, fontWeight: "600" },
  actions: { flexDirection: "row", marginBottom: spacing.xl },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: spacing.xs,
  },
  buyBtn: { backgroundColor: colors.accent },
  sellBtn: { backgroundColor: colors.surfaceAlt },
  actionText: { color: "#fff", fontWeight: "700" },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  deleteBtn: { paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.sm },
  deleteText: { color: colors.negative, fontWeight: "700" },
});
