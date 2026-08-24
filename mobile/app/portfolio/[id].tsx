import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { HoldingsSort, defaultSort, type SortState } from "@/components/HoldingsSort";
import { PortfolioChart } from "@/components/PortfolioChart";
import { RangeToggle } from "@/components/RangeToggle";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { TransactionRow } from "@/components/TransactionRow";
import { confirmDeleteTransaction } from "@/components/confirmDeleteTransaction";
import type { Holding, RangeKey, Transaction } from "@/db/types";
import {
  useDeleteTransaction,
  useHistory,
  useManualRefresh,
  usePortfolio,
  usePortfolioMeta,
  useTransactions,
} from "@/hooks/data";
import {
  formatMoney0,
  formatPct,
  formatSignedCurrency,
  gainColor,
  spacing,
  useColors,
  type Palette,
} from "@/theme";

type Tab = "holdings" | "transactions";

export default function PortfolioDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const portfolioId = Number(id);

  const [range, setRange] = useState<RangeKey>("1M");
  const [tab, setTab] = useState<Tab>("holdings");
  const [sort, setSort] = useState<SortState>(defaultSort());

  const meta = usePortfolioMeta(portfolioId);
  const portfolioQuery = usePortfolio(portfolioId);
  const historyQuery = useHistory(portfolioId, range);
  const txQuery = useTransactions(portfolioId);
  const refresh = useManualRefresh();
  const deleteTx = useDeleteTransaction();

  const p = portfolioQuery.data;
  const name = meta.data?.name ?? "Portfolio";
  const ccy = p?.display_currency ?? "USD";

  const sortedHoldings = useMemo(() => {
    const arr = [...(p?.holdings ?? [])];
    const sign = sort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let r = 0;
      switch (sort.field) {
        case "ticker": r = a.key.localeCompare(b.key); break;
        case "name": r = (a.name ?? "").localeCompare(b.name ?? ""); break;
        case "value": r = (a.market_value_usd ?? 0) - (b.market_value_usd ?? 0); break;
        case "day_pct": r = (a.day_change_pct ?? 0) - (b.day_change_pct ?? 0); break;
        case "price": r = (a.price ?? 0) - (b.price ?? 0); break;
      }
      return r * sign;
    });
    return arr;
  }, [p?.holdings, sort]);

  const header = (
    <View>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total Value ({ccy})</Text>
        <Text style={styles.summaryValue}>{formatMoney0(p?.total_value_display, ccy)}</Text>
        <Text style={[styles.summaryGain, { color: gainColor(p?.total_gain_usd) }]}>
          {formatSignedCurrency(p?.total_gain_display, ccy)} ({formatPct(p?.total_gain_pct)}) all-time
        </Text>
        <Text style={[styles.summaryDay, { color: gainColor(p?.day_change_usd) }]}>
          {formatSignedCurrency(p?.day_change_display, ccy)} today
        </Text>
      </View>

      <PortfolioChart
        points={historyQuery.data ?? []}
        currency={ccy}
        fxFactor={p?.fx_factor ?? 1}
        range={range}
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
        {tab === "holdings" && <HoldingsSort value={sort} onChange={setSort} />}
        <Link
          href={{ pathname: "/add-asset", params: { portfolioId: String(portfolioId) } }}
          asChild
        >
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

  const txns = txQuery.data ?? [];
  const showingHoldings = tab === "holdings";

  return (
    <>
      <Stack.Screen
        options={{
          title: name,
          headerRight: () => (
            <Link
              href={{
                pathname: "/portfolio-edit",
                params: { id: String(portfolioId), name, currency: meta.data?.currency ?? "" },
              }}
              asChild
            >
              <Pressable hitSlop={10}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <FlatList
        style={styles.list}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        data={showingHoldings ? sortedHoldings : txns}
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
                  params: {
                    key: h.key,
                    assetType: h.asset_type,
                    name: h.name,
                    currency: h.currency,
                    portfolioId: String(portfolioId),
                  },
                })
              }
            />
          ) : (
            <TransactionRow
              tx={item as Transaction}
              onPress={(t) =>
                router.push({ pathname: "/transaction/[id]", params: { id: String(t.id) } })
              }
              onDelete={(t) => confirmDeleteTransaction(t, () => deleteTx.mutate(t.id))}
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
    </>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  editLink: { color: colors.accent, fontSize: 15, fontWeight: "600" },
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
