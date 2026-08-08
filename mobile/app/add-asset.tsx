import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
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

import { api } from "@/api/client";
import type { SearchItem } from "@/api/types";
import { colors, spacing } from "@/theme";

type Market = "us" | "in_mf";

export default function AddAssetScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [market, setMarket] = useState<Market>("us");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");

  const searchQuery = useQuery({
    queryKey: ["search", market, submitted],
    queryFn: () => api.search(submitted, market),
    enabled: submitted.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("select an asset");
      return api.createHolding({
        asset_type: selected.asset_type,
        key: selected.key,
        display_name: selected.display_name,
        quantity: Number(quantity),
        avg_cost: avgCost ? Number(avgCost) : 0,
        currency: selected.currency,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      router.back();
    },
  });

  const canSubmit = selected && Number(quantity) > 0 && !createMutation.isPending;

  const runSearch = () => {
    setSelected(null);
    setSubmitted(query.trim());
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.marketRow}>
        {(["us", "in_mf"] as Market[]).map((m) => (
          <Pressable
            key={m}
            style={[styles.marketChip, market === m && styles.marketChipActive]}
            onPress={() => {
              setMarket(m);
              setSelected(null);
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
          placeholder={market === "us" ? "Search ticker e.g. AAPL" : "Search fund name"}
          placeholderTextColor={colors.textDim}
          value={query}
          onChangeText={setQuery}
          autoCapitalize={market === "us" ? "characters" : "none"}
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
        <Text style={styles.error}>Search failed: {String(searchQuery.error)}</Text>
      )}

      {!selected && (
        <FlatList
          style={styles.results}
          data={searchQuery.data ?? []}
          keyExtractor={(item) => `${item.asset_type}:${item.key}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable style={styles.resultRow} onPress={() => setSelected(item)}>
              <Text style={styles.resultKey}>{item.key}</Text>
              <Text style={styles.resultName} numberOfLines={2}>
                {item.display_name}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            submitted && !searchQuery.isFetching ? (
              <Text style={styles.hint}>No results for “{submitted}”.</Text>
            ) : null
          }
        />
      )}

      {selected && (
        <View style={styles.form}>
          <View style={styles.selectedCard}>
            <Text style={styles.resultKey}>{selected.key}</Text>
            <Text style={styles.resultName}>{selected.display_name}</Text>
            <Text style={styles.hint}>Priced in {selected.currency}</Text>
            <Pressable onPress={() => setSelected(null)}>
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Quantity / Units</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 10"
            placeholderTextColor={colors.textDim}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>
            Average Cost ({selected.currency}, optional)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 150"
            placeholderTextColor={colors.textDim}
            value={avgCost}
            onChangeText={setAvgCost}
            keyboardType="decimal-pad"
          />

          {createMutation.isError && (
            <Text style={styles.error}>{String(createMutation.error)}</Text>
          )}

          <Pressable
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            disabled={!canSubmit}
            onPress={() => createMutation.mutate()}
          >
            <Text style={styles.btnText}>
              {createMutation.isPending ? "Adding…" : "Add to Portfolio"}
            </Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  form: { marginTop: spacing.lg },
  selectedCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  changeLink: { color: colors.accent, marginTop: spacing.sm, fontWeight: "600" },
  fieldLabel: { color: colors.textDim, marginBottom: spacing.xs, marginTop: spacing.md },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { backgroundColor: colors.surfaceAlt },
  hint: { color: colors.textDim, marginTop: spacing.sm },
  error: { color: colors.negative, marginTop: spacing.md },
});
