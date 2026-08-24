import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "@/components/ThemeProvider";
import { getDb } from "@/db";
// Importing the background module registers the background task at load time.
import { syncBackgroundRegistration } from "@/services/background";
import { useTheme } from "@/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function ThemedNavigator() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="portfolio/[id]" options={{ title: "Portfolio" }} />
        <Stack.Screen
          name="portfolio-edit"
          options={{ title: "Portfolio", presentation: "modal" }}
        />
        <Stack.Screen
          name="add-asset"
          options={{ title: "Add Purchase", presentation: "modal" }}
        />
        <Stack.Screen name="trade" options={{ title: "Trade", presentation: "modal" }} />
        <Stack.Screen name="asset/[key]" options={{ title: "Holding" }} />
        <Stack.Screen name="transaction/[id]" options={{ title: "Edit Transaction" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      await getDb(); // create tables on first launch
      await syncBackgroundRegistration();
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
