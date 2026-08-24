import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Icon } from "@/components/Icon";
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
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<SearchResult | null>(null);

  // Filter as you type: debounce the typed text so results update ~300ms after
  // you stop typing (avoids a request on every keystroke).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const searchQuery = useSearch(market, debounced);
  const addTx = useAddTransaction();

  // The button just searches the current text immediately (no need to wait).
  const runSearch = () => {
    setSelected(null);
    setDebounced(query.trim());
    Keyboard.dismiss();
  };

  const results = (searchQuery.data ?? []).slice(0, 10); // show at most 10

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
                onPress={() => setMarket(m)}
              >
                <Text style={[styles.marketText, market === m && styles.marketTextActive]}>
                  {m === "us" ? "US Stocks & ETFs" : "India Mutual Funds"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.searchRow}>
            <View style={styles.inputWrap}>
              <Icon name="search" size={18} color={colors.textDim} />
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
            </View>
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
            data={results}
            keyExtractor={(item) => `${item.asset_type}:${item.key}`}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={({ item }) => (
              <Pressable style={styles.resultRow} onPress={() => setSelected(item)}>
                <Text style={styles.resultKey}>{item.key}</Text>
                <Text style={styles.resultName} numberOfLines={2}>
                  {item.name}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              debounced && !searchQuery.isFetching ? (
                <Text style={styles.hint}>No results for “{debounced}”.</Text>
              ) : !debounced ? (
                <Text style={styles.hint}>
                  Start typing a {market === "us" ? "ticker or company name" : "fund name"} to see matches.
                </Text>
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
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.text,
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
