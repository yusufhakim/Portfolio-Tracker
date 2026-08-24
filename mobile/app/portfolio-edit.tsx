import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
} from "@/hooks/data";
import { colors, spacing } from "@/theme";

/** Create a new portfolio, or rename / delete an existing one. */
export default function PortfolioEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const isEdit = editingId !== null;

  const [name, setName] = useState(params.name ?? "");
  const create = useCreatePortfolio();
  const rename = useRenamePortfolio();
  const remove = useDeletePortfolio();

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isEdit) {
      rename.mutate({ id: editingId!, name: trimmed }, { onSuccess: () => router.back() });
    } else {
      create.mutate(trimmed, { onSuccess: () => router.back() });
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

  const busy = create.isPending || rename.isPending || remove.isPending;

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  label: { color: colors.textDim, fontSize: 13, marginBottom: spacing.sm },
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
