import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { TxAction } from "@/db/types";
import { colors, spacing, todayIso } from "@/theme";

import { DateField } from "./DateField";

export interface TxFormValues {
  action: TxAction;
  qty: number;
  price: number;
  trade_date: string; // ISO
}

interface Props {
  assetLabel: string;
  currency: string;
  submitLabel: string;
  onSubmit: (v: TxFormValues) => void;
  submitting?: boolean;
  error?: string | null;
  initial?: Partial<TxFormValues>;
  /** Show a Buy/Sell switch (used when editing). */
  allowActionToggle?: boolean;
  /** Fixed action when the toggle is hidden (add=buy, sell=sell). */
  fixedAction?: TxAction;
  /** For sells: current qty held, shown as a hint. */
  maxQtyHint?: number;
}

export function TransactionForm({
  assetLabel,
  currency,
  submitLabel,
  onSubmit,
  submitting,
  error,
  initial,
  allowActionToggle,
  fixedAction = "buy",
  maxQtyHint,
}: Props) {
  const [action, setAction] = useState<TxAction>(initial?.action ?? fixedAction);
  const [qty, setQty] = useState(initial?.qty !== undefined ? String(initial.qty) : "");
  const [price, setPrice] = useState(initial?.price !== undefined ? String(initial.price) : "");
  const [date, setDate] = useState(initial?.trade_date ?? todayIso());
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = () => {
    const q = Number(qty);
    const p = Number(price);
    if (!(q > 0)) {
      setLocalError("Enter a quantity greater than 0.");
      return;
    }
    if (!(p >= 0) || price.trim() === "") {
      setLocalError("Enter a valid price.");
      return;
    }
    setLocalError(null);
    onSubmit({ action, qty: q, price: p, trade_date: date });
  };

  return (
    <View>
      <Text style={styles.assetLabel}>{assetLabel}</Text>

      {allowActionToggle && (
        <View style={styles.actionRow}>
          {(["buy", "sell"] as TxAction[]).map((a) => (
            <Pressable
              key={a}
              style={[styles.actionChip, action === a && styles.actionChipActive]}
              onPress={() => setAction(a)}
            >
              <Text style={[styles.actionText, action === a && styles.actionTextActive]}>
                {a === "buy" ? "Purchase" : "Sale"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>
        Quantity{maxQtyHint !== undefined ? `  (you hold ${maxQtyHint})` : ""}
      </Text>
      <TextInput
        style={styles.input}
        value={qty}
        onChangeText={setQty}
        placeholder="e.g. 1.5"
        placeholderTextColor={colors.textDim}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Price per unit ({currency})</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        placeholder="e.g. 150.25"
        placeholderTextColor={colors.textDim}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Date</Text>
      <DateField value={date} onChange={setDate} />

      {(localError || error) && <Text style={styles.error}>{localError || error}</Text>}

      <Pressable
        style={[styles.submit, submitting && styles.submitDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        <Text style={styles.submitText}>{submitting ? "Saving…" : submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  assetLabel: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: spacing.md },
  actionRow: { flexDirection: "row", marginBottom: spacing.sm },
  actionChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.chip,
    alignItems: "center",
    marginHorizontal: 2,
  },
  actionChipActive: { backgroundColor: colors.chipActive },
  actionText: { color: colors.textDim, fontWeight: "700", fontSize: 13 },
  actionTextActive: { color: "#fff" },
  label: { color: colors.textDim, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  error: { color: colors.negative, marginTop: spacing.md },
  submit: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  submitDisabled: { backgroundColor: colors.surfaceAlt },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
