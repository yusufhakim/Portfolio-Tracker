import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, useColors, type Palette } from "@/theme";

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentedToggle<T extends string>({ options, value, onChange }: Props<T>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[styles.seg, active && styles.segActive]}
            onPress={() => onChange(o.value)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
  },
  seg: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: "center",
  },
  segActive: { backgroundColor: colors.chipActive },
  label: { color: colors.textDim, fontWeight: "700", fontSize: 13 },
  labelActive: { color: "#fff" },
});
