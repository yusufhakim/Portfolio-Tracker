import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

import { TransactionForm } from "@/components/TransactionForm";
import type { AssetType, TxAction } from "@/db/types";
import { useAddTransaction } from "@/hooks/data";
import { colors, spacing } from "@/theme";

/** Add another buy or a sell for an existing asset. */
export default function TradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    assetType: string;
    key: string;
    name: string;
    currency: string;
    action: string;
    maxQty?: string;
    portfolioId?: string;
  }>();

  const action = (params.action === "sell" ? "sell" : "buy") as TxAction;
  const maxQty = params.maxQty ? Number(params.maxQty) : undefined;
  const addTx = useAddTransaction();
  const [error, setError] = useState<string | null>(null);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TransactionForm
        assetLabel={`${params.key} — ${params.name}`}
        currency={params.currency}
        fixedAction={action}
        maxQtyHint={action === "sell" ? maxQty : undefined}
        submitLabel={action === "sell" ? "Record Sale" : "Add Purchase"}
        submitting={addTx.isPending}
        error={error}
        onSubmit={(v) => {
          if (action === "sell" && maxQty !== undefined && v.qty > maxQty + 1e-9) {
            setError(`You only hold ${maxQty}. Enter ${maxQty} or less.`);
            return;
          }
          setError(null);
          addTx.mutate(
            {
              portfolio_id: Number(params.portfolioId),
              asset_type: params.assetType as AssetType,
              key: params.key,
              name: params.name,
              currency: params.currency,
              action,
              qty: v.qty,
              price: v.price,
              trade_date: v.trade_date,
            },
            {
              onSuccess: () => router.back(),
              onError: () => setError("Could not save. Try again."),
            },
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
});
