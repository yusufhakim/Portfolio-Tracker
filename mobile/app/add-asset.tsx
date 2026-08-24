import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { TransactionForm } from "@/components/TransactionForm";
import { defaultPortfolioId } from "@/db";
import type { SearchResult } from "@/services/providers";
import { useAddTransaction, useSearch } from "@/hooks/data";
import { spacing, useColors, type Palette } from "@/theme";

type Market = "us" | "in_mf";

export default function AddAssetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ portfolioId?: string }>();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [market, setMarket] = useState<Market>("us");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<SearchResult | null>(null);

  const searchQuery = useSearch(market, submitted);
  const addTx = useAddTransaction();

  const runSearch = () => {
    setSelected(null);
    setSubmitted(query.trim());
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {!selected && (
        <>
          <View style={styles.marketRow}>
            {(["us", "in_mf"] as Market[]).map((m) => (
              <Pressable
                key={m}
                style={[styles.marketChip, market === m && styles.marketChipActive]}
                onPress={() => {
                  setMarket(m);
                  setSubmitted("");
                }}
              >
                <Text style={[styles.marketText, market === m && styles.marketTextActive]}>
                  {m === "us" ? "US Stocks & ETFs" : "India Mutual Funds"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder={market === "us" ? "Search 'apple' or 'AAPL'" : "Search fund name"}
              placeholderTextColor={colors.textDim}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              onSubmitEditing={runSearch}
              returnKeyType="search"
            />
            <Pressable style={styles.searchBtn} onPress={runSearch}>
              <Text style={styles.btnText}>Search</Text>
            </Pressable>
          </View>

          {searchQuery.isFetching && (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
          )}
          {searchQuery.isError && (
            <Text style={styles.error}>Search failed. Check your connection and try again.</Text>
          )}

          <FlatList
            style={styles.results}
            data={searchQuery.data ?? []}
            keyExtractor={(item) => `${item.asset_type}:${item.key}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable style={styles.resultRow} onPress={() => setSelected(item)}>
                <Text style={styles.resultKey}>{item.key}</Text>
                <Text style={styles.resultName} numberOfLines={2}>
                  {item.name}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              submitted && !searchQuery.isFetching ? (
                <Text style={styles.hint}>No results for “{submitted}”.</Text>
              ) : null
            }
          />
        </>
      )}

      {selected && (
        <View style={styles.form}>
          <Pressable onPress={() => setSelected(null)}>
            <Text style={styles.changeLink}>‹ Change asset</Text>
          </Pressable>
          <View style={{ height: spacing.md }} />
          <TransactionForm
            assetLabel={`${selected.key} — ${selected.name}`}
            currency={selected.currency}
            fixedAction="buy"
            submitLabel="Add Purchase"
            submitting={addTx.isPending}
            error={
              addTx.isError
                ? `Could not save: ${addTx.error instanceof Error ? addTx.error.message : String(addTx.error)}`
                : null
            }
            onSubmit={async (v) => {
              const pid = params.portfolioId
                ? Number(params.portfolioId)
                : await defaultPortfolioId();
              addTx.mutate(
                {
                  portfolio_id: pid,
                  asset_type: selected.asset_type,
                  key: selected.key,
                  name: selected.name,
                  currency: selected.currency,
                  action: "buy",
                  qty: v.qty,
                  price: v.price,
                  trade_date: v.trade_date,
                },
                { onSuccess: () => router.back() },
              );
            }}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  marketRow: { flexDirection: "row", marginBottom: spacing.md },
  marketChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.chip,
    alignItems: "center",
    marginHorizontal: 2,
  },
  marketChipActive: { backgroundColor: colors.chipActive },
  marketText: { color: colors.textDim, fontSize: 13, fontWeight: "600" },
  marketTextActive: { color: "#fff" },
  searchRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  results: { marginTop: spacing.md },
  resultRow: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  resultKey: { color: colors.text, fontWeight: "700", fontSize: 15 },
  resultName: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  form: { flex: 1 },
  changeLink: { color: colors.accent, fontWeight: "600", fontSize: 15 },
  hint: { color: colors.textDim, marginTop: spacing.sm },
  error: { color: colors.negative, marginTop: spacing.md },
});
