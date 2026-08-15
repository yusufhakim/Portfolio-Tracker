import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { isBackgroundEnabled, setBackgroundEnabled } from "@/services/background";
import { useManualRefresh } from "@/hooks/data";
import { colors, spacing } from "@/theme";

export default function SettingsScreen() {
  const qc = useQueryClient();
  const refresh = useManualRefresh();
  const [saving, setSaving] = useState(false);

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

  return (
    <View style={styles.container}>
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

      <Text style={styles.note}>
        Prices also refresh every time you open the app and while it stays open. US stock prices only
        move during US market hours; Indian mutual fund values update once a day after the official NAV
        is published.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  desc: { color: colors.textDim, fontSize: 13, marginTop: spacing.xs, lineHeight: 18 },
  refreshBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  refreshText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  note: { color: colors.textDim, fontSize: 12, marginTop: spacing.lg, lineHeight: 18 },
});
