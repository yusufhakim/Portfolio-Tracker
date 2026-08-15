import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HoldingRow } from "@/components/HoldingRow";
import { PortfolioChart } from "@/components/PortfolioChart";
import { RangeToggle } from "@/components/RangeToggle";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { TransactionRow } from "@/components/TransactionRow";
import type { Holding, RangeKey, Transaction } from "@/db/types";
import {
  useAutoRefresh,
  useHistory,
  useManualRefresh,
  usePortfolio,
  useTransactions,
} from "@/hooks/data";
import {
  colors,
  formatCurrency,
  formatPct,
  formatSignedCurrency,
  gainColor,
  spacing,
} from "@/theme";

type Tab = "holdings" | "transactions";

export default function PortfolioScreen() {
  useAutoRefresh();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>("1M");
  const [tab, setTab] = useState<Tab>("holdings");

  const portfolioQuery = usePortfolio();
  const historyQuery = useHistory(range);
  const txQuery = useTransactions();
  const refresh = useManualRefresh();

  const p = portfolioQuery.data;

  const header = (
    <View>
      <View style={styles.topBar}>
        <Text style={styles.appName}>Portfolio</Text>
        <Link href="/settings" asChild>
          <Pressable hitSlop={10}>
            <Text style={styles.gear}>⚙︎</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total Value (USD)</Text>
        <Text style={styles.summaryValue}>{formatCurrency(p?.total_value_usd, "USD")}</Text>
        <Text style={[styles.summaryGain, { color: gainColor(p?.total_gain_usd) }]}>
          {formatSignedCurrency(p?.total_gain_usd, "USD")} ({formatPct(p?.total_gain_pct)}) all-time
        </Text>
        <Text style={[styles.summaryDay, { color: gainColor(p?.day_change_usd) }]}>
          {formatSignedCurrency(p?.day_change_usd, "USD")} today
        </Text>
      </View>

      <PortfolioChart
        points={historyQuery.data ?? []}
        baseCurrency="USD"
        loading={historyQuery.isLoading}
      />
      <RangeToggle value={range} onChange={setRange} />

      <View style={styles.controlsRow}>
        <View style={{ flex: 1 }}>
          <SegmentedToggle
            options={[
              { value: "holdings", label: "Holdings" },
              { value: "transactions", label: "Transactions" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>
        <Link href="/add-asset" asChild>
          <Pressable style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );

  if (portfolioQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const holdings = p?.holdings ?? [];
  const txns = txQuery.data ?? [];
  const showingHoldings = tab === "holdings";

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: insets.top + spacing.sm,
        paddingBottom: insets.bottom + spacing.xl,
      }}
      data={showingHoldings ? holdings : txns}
      keyExtractor={(item: Holding | Transaction) =>
        showingHoldings
          ? `${(item as Holding).asset_type}:${(item as Holding).key}`
          : `tx-${(item as Transaction).id}`
      }
      ListHeaderComponent={header}
      renderItem={({ item }) =>
        showingHoldings ? (
          <HoldingRow
            holding={item as Holding}
            onPress={(h) =>
              router.push({
                pathname: "/asset/[key]",
                params: { key: h.key, assetType: h.asset_type, name: h.name, currency: h.currency },
              })
            }
          />
        ) : (
          <TransactionRow
            tx={item as Transaction}
            onPress={(t) =>
              router.push({ pathname: "/transaction/[id]", params: { id: String(t.id) } })
            }
          />
        )
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {showingHoldings
            ? "No holdings yet. Tap “+ Add” to record your first purchase."
            : "No transactions yet."}
        </Text>
      }
      refreshControl={
        <RefreshControl
          refreshing={refresh.isPending}
          onRefresh={() => refresh.mutate()}
          tintColor={colors.accent}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  appName: { color: colors.text, fontSize: 22, fontWeight: "800" },
  gear: { color: colors.textDim, fontSize: 22 },
  summary: { alignItems: "center", marginBottom: spacing.lg },
  summaryLabel: { color: colors.textDim, fontSize: 13 },
  summaryValue: { color: colors.text, fontSize: 34, fontWeight: "800", marginTop: 4 },
  summaryGain: { fontSize: 14, marginTop: 6, fontWeight: "600" },
  summaryDay: { fontSize: 13, marginTop: 2 },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  addBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginLeft: spacing.md,
  },
  addBtnText: { color: "#fff", fontWeight: "700" },
  empty: { color: colors.textDim, textAlign: "center", marginTop: spacing.lg },
});
