import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RangeKey } from "@/db/types";
import { colors, spacing } from "@/theme";

const RANGES: RangeKey[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

interface Props {
  value: RangeKey;
  onChange: (r: RangeKey) => void;
}

export function RangeToggle({ value, onChange }: Props) {
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

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  chip: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.chip,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: colors.chipActive,
  },
  label: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "600",
  },
  labelActive: {
    color: "#fff",
  },
});
