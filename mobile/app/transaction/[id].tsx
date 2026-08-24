import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { TransactionForm } from "@/components/TransactionForm";
import { getTransaction } from "@/db";
import { useDeleteTransaction, useUpdateTransaction } from "@/hooks/data";
import { spacing, useColors, type Palette } from "@/theme";

export default function EditTransactionScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const txId = Number(id);

  const txQuery = useQuery({
    queryKey: ["single-tx", txId],
    queryFn: () => getTransaction(txId),
  });
  const updateTx = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();

  const tx = txQuery.data;

  const confirmDelete = () => {
    Alert.alert("Delete transaction?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTx.mutate(txId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  if (txQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!tx) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>Transaction not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
      <TransactionForm
        assetLabel={`${tx.key} — ${tx.name}`}
        currency={tx.currency}
        allowActionToggle
        initial={{
          action: tx.action,
          qty: tx.qty,
          price: tx.price,
          trade_date: tx.trade_date,
        }}
        submitLabel="Save Changes"
        submitting={updateTx.isPending}
        error={updateTx.isError ? "Could not save. Try again." : null}
        onSubmit={(v) =>
          updateTx.mutate(
            {
              id: txId,
              patch: {
                action: v.action,
                qty: v.qty,
                price: v.price,
                trade_date: v.trade_date,
              },
            },
            { onSuccess: () => router.back() },
          )
        }
      />
      <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
        <Text style={styles.deleteText}>Delete this transaction</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" },
  missing: { color: colors.textDim },
  deleteBtn: { paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.md },
  deleteText: { color: colors.negative, fontWeight: "700" },
});
