import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../lib/theme";
import { LoadingScreen } from "../components/LoadingScreen";

function InnerLayout() {
  const { scheme } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Configure notifications (fails silently in Expo Go / if unavailable)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { configureNotificationHandler } = require("../lib/notifications");
      configureNotificationHandler();
    } catch {
      // ignore
    }

    // Show the loading screen for a brief moment, then reveal the app.
    // This never blocks indefinitely — it always fires.
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return <LoadingScreen message="Starting up…" />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="lock" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <InnerLayout />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
