import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from "react-native";

import { beginTrusted, endTrusted, isTrusted } from "@/services/lockControl";
import { spacing, useColors, type Palette } from "@/theme";

type LockState = "checking" | "locked" | "unlocked";

/**
 * Requires the phone's own lock (biometrics or device PIN/pattern/password)
 * before revealing the app — on cold start AND every time the app returns to the
 * foreground after being backgrounded (so it locks the moment you leave it).
 * In-app system pickers (file/folder) and the auth prompt itself are marked as
 * "trusted" so they don't trip the lock. If the device has no lock enrolled, or
 * the auth API errors, we fail open so the user can never be locked out.
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [state, setState] = useState<LockState>("checking");
  const stateRef = useRef<LockState>("checking");
  stateRef.current = state;

  const authenticate = useCallback(async () => {
    setState("checking");
    beginTrusted(); // the auth prompt may itself background the app
    try {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level === LocalAuthentication.SecurityLevel.NONE) {
        setState("unlocked"); // no screen lock set — nothing to authenticate against
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Portfolio Tracker",
        disableDeviceFallback: false, // allow the phone's PIN/pattern/password too
        cancelLabel: "Cancel",
      });
      setState(res.success ? "unlocked" : "locked");
    } catch {
      setState("unlocked"); // fail open on any error
    } finally {
      setTimeout(endTrusted, 800);
    }
  }, []);

  // Cold start.
  useEffect(() => {
    authenticate();
  }, [authenticate]);

  // Lock the instant the app leaves the foreground; re-auth when it comes back.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") {
        if (!isTrusted() && stateRef.current === "unlocked") setState("locked");
      } else if (next === "active") {
        if (!isTrusted() && stateRef.current === "locked") authenticate();
      }
    });
    return () => sub.remove();
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
