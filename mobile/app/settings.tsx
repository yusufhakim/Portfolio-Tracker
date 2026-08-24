import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { isBackgroundEnabled, setBackgroundEnabled } from "@/services/background";
import { downloadTemplate } from "@/services/importTransactions";
import { useImportTransactions, useManualRefresh } from "@/hooks/data";
import { colors, spacing } from "@/theme";

export default function SettingsScreen() {
  const qc = useQueryClient();
  const refresh = useManualRefresh();
  const importTx = useImportTransactions();
  const [saving, setSaving] = useState(false);
  const [templating, setTemplating] = useState(false);

  const getTemplate = async () => {
    setTemplating(true);
    try {
      await downloadTemplate();
    } catch (e) {
      Alert.alert("Couldn't create template", e instanceof Error ? e.message : String(e));
    } finally {
      setTemplating(false);
    }
  };

  const bgQuery = useQuery({
    queryKey: ["bg-enabled"],
    queryFn: isBackgroundEnabled,
  });
  const enabled = bgQuery.data ?? false;

  const toggle = async (next: boolean) => {
    setSaving(true);
    await setBackgroundEnabled(next);
    await qc.invalidateQueries({ queryKey: ["bg-enabled"] });
    setSaving(false);
  };

  const runImport = () => {
    importTx.mutate(undefined, {
      onSuccess: (r) => {
        if (r.canceled) return;
        const parts = [`Imported ${r.inserted} transaction(s).`];
        if (r.errors.length) {
          parts.push("", `Skipped ${r.errors.length} row(s):`);
          parts.push(...r.errors.slice(0, 8));
          if (r.errors.length > 8) parts.push(`…and ${r.errors.length - 8} more.`);
        }
        Alert.alert("Import complete", parts.join("\n"));
      },
      onError: (err) =>
        Alert.alert(
          "Import failed",
          `${err instanceof Error ? err.message : String(err)}\n\nMake sure the file is an .xlsx or .csv with the columns above.`,
        ),
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={styles.title}>Background updates</Text>
            <Text style={styles.desc}>
              Refresh prices in the background while the app is closed. Uses mobile data / Wi-Fi.
              Android controls the exact timing (roughly every 15+ minutes) — turn this off to save
              data and battery.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggle}
            disabled={saving || bgQuery.isLoading}
            trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
          />
        </View>
      </View>

      <Pressable
        style={styles.refreshBtn}
        onPress={() => refresh.mutate()}
        disabled={refresh.isPending}
      >
        <Text style={styles.refreshText}>
          {refresh.isPending ? "Refreshing…" : "Refresh prices now"}
        </Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.title}>Import from Excel / CSV</Text>
        <Text style={styles.desc}>
          Bulk-add buy and sell transactions from a spreadsheet with these columns:
        </Text>
        <Text style={styles.code}>Portfolio · Market · Symbol · Action · Quantity · Price · Date</Text>
        <Text style={styles.desc}>
          • Portfolio: which bucket to add to (blank = your default; a new name is created
          automatically)  • Market: “US” or “India”  • Symbol: ticker (US) or AMFI scheme code
          (India)  • Action: Buy or Sell  • Price: in the asset's own currency  • Date: dd/mm/yyyy
        </Text>
        <Text style={styles.desc}>
          Step 1: tap “Download template” and save it to your phone. Fill in your rows, then Step 2:
          tap “Choose file & import”.
        </Text>
        <Pressable
          style={[styles.templateBtn, templating && styles.importBtnDisabled]}
          onPress={getTemplate}
          disabled={templating}
        >
          <Text style={styles.templateText}>
            {templating ? "Preparing…" : "⬇ Download template"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.importBtn, importTx.isPending && styles.importBtnDisabled]}
          onPress={runImport}
          disabled={importTx.isPending}
        >
          <Text style={styles.refreshText}>
            {importTx.isPending ? "Importing…" : "Choose file & import"}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.note}>
        Prices also refresh every time you open the app and while it stays open. US stock prices only
        move during US market hours; Indian mutual fund values update once a day after the official NAV
        is published.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  desc: { color: colors.textDim, fontSize: 13, marginTop: spacing.xs, lineHeight: 18 },
  code: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  refreshBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  refreshText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  templateBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  templateText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  importBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  importBtnDisabled: { backgroundColor: colors.surfaceAlt },
  note: { color: colors.textDim, fontSize: 12, marginTop: spacing.xs, lineHeight: 18 },
});
