import { Link, useRouter } from "expo-router";
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

import { IndexCard } from "@/components/IndexCard";
import { Logo } from "@/components/Logo";
import { PortfolioRow } from "@/components/PortfolioRow";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import type { PortfolioWithValue } from "@/db/types";
import {
  useAutoRefresh,
  useIndices,
  useManualRefresh,
  usePortfolios,
} from "@/hooks/data";
import { spacing, useColors, type Palette } from "@/theme";

type Market = "us" | "in";

export default function DashboardScreen() {
  useAutoRefresh();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [market, setMarket] = useState<Market>("us");

  const indices = useIndices(market);
  const portfolios = usePortfolios();
  const refresh = useManualRefresh();

  const header = (
    <View>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Logo variant="mark" size={22} />
          <Text style={styles.appName}>Yusuf's Portfolio Tracker</Text>
        </View>
        <Link href="/settings" asChild>
          <Pressable hitSlop={10}>
            <Text style={styles.gear}>⚙︎</Text>
          </Pressable>
        </Link>
      </View>

      <SegmentedToggle
        options={[
          { value: "us", label: "USA" },
          { value: "in", label: "India" },
        ]}
        value={market}
        onChange={setMarket}
      />

      <View style={styles.indexBlock}>
        {indices.isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
        ) : (
          <View style={styles.indexRow}>
            {(indices.data ?? []).map((q) => (
              <IndexCard key={q.symbol} quote={q} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Portfolios</Text>
        <Link href={{ pathname: "/portfolio-edit" }} asChild>
          <Pressable style={styles.addBtn} hitSlop={8}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: insets.top + spacing.sm,
        paddingBottom: insets.bottom + spacing.xl,
      }}
      data={portfolios.data ?? []}
      keyExtractor={(p: PortfolioWithValue) => `pf-${p.id}`}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <PortfolioRow
          portfolio={item}
          onPress={(p) =>
            router.push({ pathname: "/portfolio/[id]", params: { id: String(p.id) } })
          }
        />
      )}
      ListEmptyComponent={
        portfolios.isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
        ) : (
          <Text style={styles.empty}>
            No portfolios yet. Tap “+” to create your first one.
          </Text>
        )
      }
      refreshControl={
        <RefreshControl
          refreshing={refresh.isPending}
          onRefresh={() => {
            refresh.mutate();
            indices.refetch();
          }}
          tintColor={colors.accent}
        />
      }
    />
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: spacing.md },
  appName: { color: colors.text, fontSize: 22, fontWeight: "800", flexShrink: 1 },
  gear: { color: colors.textDim, fontSize: 22 },
  indexBlock: { minHeight: 60, marginTop: spacing.md },
  indexRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginHorizontal: -3, // cancel the cards' outer margin so the row aligns flush
    paddingVertical: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 26 },
  empty: { color: colors.textDim, textAlign: "center", marginTop: spacing.lg },
});
