import { useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";

import { getSetting, setSetting } from "@/db";
import {
  ThemeContext,
  darkColors,
  lightColors,
  type ThemeMode,
  type ThemeValue,
} from "@/theme";

const SETTING_KEY = "theme_mode";

function isMode(v: string | null): v is ThemeMode {
  return v === "light" || v === "dark" || v === "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme());

  // Load the saved preference once.
  useEffect(() => {
    (async () => {
      try {
        const saved = await getSetting(SETTING_KEY);
        if (isMode(saved)) setModeState(saved);
      } catch {
        /* keep default */
      }
    })();
  }, []);

  // Track OS light/dark while "system" is selected.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const resolved = mode === "system" ? systemScheme ?? "dark" : mode;
    const isDark = resolved !== "light";
    return {
      colors: isDark ? darkColors : lightColors,
      isDark,
      mode,
      setMode: (m: ThemeMode) => {
        setModeState(m);
        setSetting(SETTING_KEY, m).catch(() => {});
      },
    };
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
