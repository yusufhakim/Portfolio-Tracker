import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { spacing, useColors, type Palette } from "@/theme";

export type SortField = "ticker" | "name" | "value" | "day_pct" | "price";
export type SortDir = "asc" | "desc";
export interface SortState {
  field: SortField;
  dir: SortDir;
}

interface FieldDef {
  field: SortField;
  label: string;
  asc: string; // label for ascending direction
  desc: string; // label for descending direction
  /** Sensible default direction when this field is first picked. */
  defaultDir: SortDir;
}

const FIELDS: FieldDef[] = [
  { field: "ticker", label: "Ticker symbol", asc: "A–Z", desc: "Z–A", defaultDir: "asc" },
  { field: "name", label: "Company name", asc: "A–Z", desc: "Z–A", defaultDir: "asc" },
  { field: "value", label: "Portfolio value", asc: "Low → High", desc: "High → Low", defaultDir: "desc" },
  { field: "day_pct", label: "Daily % change", asc: "Low → High", desc: "High → Low", defaultDir: "desc" },
  { field: "price", label: "Current price", asc: "Low → High", desc: "High → Low", defaultDir: "desc" },
];

export function defaultSort(): SortState {
  return { field: "value", dir: "desc" };
}

interface Props {
  value: SortState;
  onChange: (s: SortState) => void;
}

/** Compact "Sort" button that opens a picker of field + direction (Holdings only). */
export function HoldingsSort({ value, onChange }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const pick = (f: FieldDef) => {
    if (f.field === value.field) {
      // same field → flip direction
      onChange({ field: f.field, dir: value.dir === "asc" ? "desc" : "asc" });
    } else {
      onChange({ field: f.field, dir: f.defaultDir });
    }
    setOpen(false);
  };

  return (
    <>
      <Pressable style={styles.btn} onPress={() => setOpen(true)}>
        <Icon name="sort" size={16} />
        <Text style={styles.btnText}>Sort</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>Sort holdings by</Text>
            {FIELDS.map((f) => {
              const active = f.field === value.field;
              const dirLabel = active ? (value.dir === "asc" ? f.asc : f.desc) : f.defaultDir === "asc" ? f.asc : f.desc;
              return (
                <Pressable
                  key={f.field}
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => pick(f)}
                >
                  <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{f.label}</Text>
                  <Text style={[styles.rowDir, active && styles.rowDirActive]}>
                    {active ? (value.dir === "asc" ? "↑ " : "↓ ") : ""}
                    {dirLabel}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.hint}>Tap the selected field again to reverse the order.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  btnText: { color: colors.text, fontWeight: "700" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
  },
  rowActive: { backgroundColor: colors.surfaceAlt },
  rowLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  rowLabelActive: { color: colors.accent },
  rowDir: { color: colors.textDim, fontSize: 13 },
  rowDirActive: { color: colors.accent, fontWeight: "700" },
  hint: { color: colors.textDim, fontSize: 12, marginTop: spacing.sm, textAlign: "center" },
});
