import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getDb } from "@/db";
// Importing the background module registers the background task at load time.
import { syncBackgroundRegistration } from "@/services/background";
import { colors } from "@/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

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
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: "Portfolio" }} />
          <Stack.Screen
            name="add-asset"
            options={{ title: "Add Purchase", presentation: "modal" }}
          />
          <Stack.Screen name="trade" options={{ title: "Trade", presentation: "modal" }} />
          <Stack.Screen name="asset/[key]" options={{ title: "Holding" }} />
          <Stack.Screen name="transaction/[id]" options={{ title: "Edit Transaction" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
