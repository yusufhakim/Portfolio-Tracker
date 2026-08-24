import DateTimePicker from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import { Icon } from "@/components/Icon";
import { displayToIso, isoToDisplay, spacing, useColors, type Palette } from "@/theme";

interface Props {
  /** ISO yyyy-mm-dd */
  value: string;
  onChange: (iso: string) => void;
}

/** Date input: typeable dd/mm/yyyy plus a calendar-picker button. */
export function DateField({ value, onChange }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [text, setText] = useState(isoToDisplay(value));
  const [showPicker, setShowPicker] = useState(false);

  const commitText = (t: string) => {
    setText(t);
    const iso = displayToIso(t);
    if (iso) onChange(iso);
  };

  const pickerDate = (() => {
    const iso = displayToIso(text) ?? value;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  })();

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={commitText}
        placeholder="dd/mm/yyyy"
        placeholderTextColor={colors.textDim}
        keyboardType="numbers-and-punctuation"
      />
      <Pressable style={styles.calBtn} onPress={() => setShowPicker(true)}>
        <Icon name="calendar" size={20} />
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "calendar"}
          maximumDate={new Date()}
          onChange={(event, selected) => {
            setShowPicker(Platform.OS === "ios" && event.type !== "dismissed");
            if (event.type === "set" && selected) {
              const iso = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`;
              onChange(iso);
              setText(isoToDisplay(iso));
              if (Platform.OS !== "ios") setShowPicker(false);
            }
          }}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  calBtn: {
    marginLeft: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
