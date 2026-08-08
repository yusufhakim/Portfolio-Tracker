import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
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

import { api } from "@/api/client";
import type { RangeKey } from "@/api/types";
import { HoldingRow } from "@/components/HoldingRow";
import { PortfolioChart } from "@/components/PortfolioChart";
import { RangeToggle } from "@/components/RangeToggle";
import { colors, formatCurrency, formatPct, gainColor, spacing } from "@/theme";

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<RangeKey>("1M");

  const portfolioQuery = useQuery({
    queryKey: ["portfolio"],
    queryFn: api.getPortfolio,
    refetchInterval: 60_000, // poll while foregrounded; backend owns the real cadence
  });

  const historyQuery = useQuery({
    queryKey: ["history", range],
    queryFn: () => api.getHistory(range),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteHolding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  const portfolio = portfolioQuery.data;
  const base = portfolio?.base_currency ?? "USD";

  const refreshing =
    portfolioQuery.isFetching && !portfolioQuery.isLoading;

  const onRefresh = async () => {
    await api.refresh().catch(() => undefined);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
      queryClient.invalidateQueries({ queryKey: ["history"] }),
    ]);
  };

  const header = (
    <View>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total Value</Text>
        <Text style={styles.summaryValue}>
          {formatCurrency(portfolio?.total_value_base, base)}
        </Text>
        <Text style={[styles.summaryGain, { color: gainColor(portfolio?.total_gain_base) }]}>
          {formatCurrency(portfolio?.total_gain_base, base)} (
          {formatPct(portfolio?.total_gain_pct)}) all-time
        </Text>
        <Text style={[styles.summaryDay, { color: gainColor(portfolio?.day_change_base) }]}>
          {formatCurrency(portfolio?.day_change_base, base)} today
        </Text>
      </View>

      <PortfolioChart
        points={historyQuery.data?.points ?? []}
        baseCurrency={base}
        loading={historyQuery.isLoading}
      />
      <RangeToggle value={range} onChange={setRange} />

      <View style={styles.holdingsHeader}>
        <Text style={styles.sectionTitle}>Holdings</Text>
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

  if (portfolioQuery.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Couldn’t reach the API at {api.baseUrl}.
        </Text>
        <Text style={styles.errorHint}>
          Start the backend and set EXPO_PUBLIC_API_URL to your machine’s LAN IP.
        </Text>
        <Pressable style={styles.retryBtn} onPress={() => portfolioQuery.refetch()}>
          <Text style={styles.addBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
      }}
      data={portfolio?.holdings ?? []}
      keyExtractor={(h) => String(h.id)}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <HoldingRow
          holding={item}
          baseCurrency={base}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>
          No holdings yet. Tap “+ Add” to add a stock, ETF, or Indian mutual fund.
        </Text>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  summary: { alignItems: "center", marginBottom: spacing.lg },
  summaryLabel: { color: colors.textDim, fontSize: 13 },
  summaryValue: { color: colors.text, fontSize: 36, fontWeight: "800", marginTop: 4 },
  summaryGain: { fontSize: 14, marginTop: 6, fontWeight: "600" },
  summaryDay: { fontSize: 13, marginTop: 2 },
  holdingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  addBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "700" },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.lg,
  },
  empty: { color: colors.textDim, textAlign: "center", marginTop: spacing.lg },
  errorText: { color: colors.text, textAlign: "center", fontSize: 15 },
  errorHint: {
    color: colors.textDim,
    textAlign: "center",
    marginTop: spacing.sm,
    fontSize: 13,
  },
});
