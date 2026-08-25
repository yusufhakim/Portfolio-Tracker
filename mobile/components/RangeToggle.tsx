import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RangeKey } from "@/db/types";
import { spacing, useColors, type Palette } from "@/theme";

const RANGES: RangeKey[] = ["1D", "1W", "1M", "3M", "1Y", "5Y", "MAX"];

interface Props {
  value: RangeKey;
  onChange: (r: RangeKey) => void;
}

export function RangeToggle({ value, onChange }: Props) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.row}>
      {RANGES.map((r) => {
        const active = r === value;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{r}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  chip: {
    flex: 1,
    marginHorizontal: 1.5,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: c.chip,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: c.chipActive,
  },
  label: {
    color: c.textDim,
    fontSize: 11,
    fontWeight: "600",
  },
  labelActive: {
    color: "#fff",
  },
});
