import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useCreatePortfolio,
  useDeletePortfolio,
  useRenamePortfolio,
  useSetPortfolioCurrency,
} from "@/hooks/data";
import { spacing, useColors, type Palette } from "@/theme";

/** Currency override options; "" = Default (USD). Labels exactly as specified. */
const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Default" },
  { value: "INR", label: "INR (₹)" },
  { value: "USD", label: "USD ($)" },
  { value: "AED", label: "AED (D)" },
];

/** Create a new portfolio, or rename / delete an existing one. */
export default function PortfolioEditScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ id?: string; name?: string; currency?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const isEdit = editingId !== null;

  const [name, setName] = useState(params.name ?? "");
  const [currency, setCurrency] = useState(params.currency ?? "");
  const create = useCreatePortfolio();
  const rename = useRenamePortfolio();
  const remove = useDeletePortfolio();
  const setCcy = useSetPortfolioCurrency();

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ccy = currency === "" ? null : currency;
    if (isEdit) {
      rename.mutate({ id: editingId!, name: trimmed });
      setCcy.mutate({ id: editingId!, currency: ccy }, { onSuccess: () => router.back() });
    } else {
      create.mutate(trimmed, {
        onSuccess: (newId) => {
          if (ccy) setCcy.mutate({ id: newId, currency: ccy }, { onSuccess: () => router.back() });
          else router.back();
        },
      });
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete this portfolio?",
      `This removes “${params.name ?? "this portfolio"}” and ALL of its transactions. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            remove.mutate(editingId!, {
              // pop back to the dashboard (this screen + the portfolio detail)
              onSuccess: () => router.replace("/"),
            }),
        },
      ],
    );
  };

  const busy = create.isPending || rename.isPending || remove.isPending || setCcy.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: isEdit ? "Edit Portfolio" : "New Portfolio" }} />

      <Text style={styles.label}>Portfolio name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. India, USA, Retirement"
        placeholderTextColor={colors.textDim}
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
      />

      <Text style={[styles.label, { marginTop: spacing.lg }]}>Display currency</Text>
      <Text style={styles.hint}>
        Show this portfolio's value converted into this currency. “Default” uses USD. Conversions use
        the latest live FX rate.
      </Text>
      <View style={styles.ccyRow}>
        {CURRENCY_OPTIONS.map((o) => {
          const active = currency === o.value;
          return (
            <Pressable
              key={o.value || "default"}
              style={[styles.ccyChip, active && styles.ccyChipActive]}
              onPress={() => setCurrency(o.value)}
            >
              <Text style={[styles.ccyText, active && styles.ccyTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.saveBtn, (busy || !name.trim()) && styles.saveBtnDisabled]}
        onPress={save}
        disabled={busy || !name.trim()}
      >
        <Text style={styles.saveText}>{isEdit ? "Save changes" : "Create portfolio"}</Text>
      </Pressable>

      {isEdit && (
        <Pressable style={styles.deleteBtn} onPress={confirmDelete} disabled={busy}>
          <Text style={styles.deleteText}>Delete this portfolio</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  label: { color: colors.textDim, fontSize: 13, marginBottom: spacing.sm },
  hint: { color: colors.textDim, fontSize: 12, marginBottom: spacing.sm, lineHeight: 17 },
  ccyRow: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  ccyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.chip,
    margin: 4,
  },
  ccyChipActive: { backgroundColor: colors.chipActive },
  ccyText: { color: colors.textDim, fontWeight: "700", fontSize: 14 },
  ccyTextActive: { color: "#fff" },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  saveBtnDisabled: { backgroundColor: colors.surfaceAlt },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  deleteBtn: { paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.md },
  deleteText: { color: colors.negative, fontWeight: "700" },
});
