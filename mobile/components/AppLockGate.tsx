import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, useColors, type Palette } from "@/theme";

type LockState = "checking" | "locked" | "unlocked";

/**
 * Requires the phone's own lock (biometrics or device PIN/pattern/password)
 * before revealing the app on launch. If the device has no lock enrolled, or the
 * auth API errors, we fail open so the user can never be locked out of their own
 * data. Authentication runs once on cold start (not on every foreground, so the
 * file/folder pickers don't force a re-auth mid-task).
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [state, setState] = useState<LockState>("checking");

  const authenticate = useCallback(async () => {
    setState("checking");
    try {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level === LocalAuthentication.SecurityLevel.NONE) {
        // No screen lock set on the phone — nothing to authenticate against.
        setState("unlocked");
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Portfolio Tracker",
        // allow the phone's PIN/pattern/password if biometrics fail or aren't set
        disableDeviceFallback: false,
        cancelLabel: "Cancel",
      });
      setState(res.success ? "unlocked" : "locked");
    } catch {
      setState("unlocked"); // fail open on any error
    }
  }, []);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  if (state === "unlocked") return <>{children}</>;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Portfolio Tracker</Text>
      {state === "checking" ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          <Text style={styles.sub}>Locked. Verify it's you to continue.</Text>
          <Pressable style={styles.btn} onPress={authenticate}>
            <Text style={styles.btnText}>Unlock</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  sub: { color: colors.textDim, fontSize: 14, marginTop: spacing.md, textAlign: "center" },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
