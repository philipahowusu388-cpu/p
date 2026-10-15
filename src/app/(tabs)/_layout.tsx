import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { router } from "expo-router";
import { useTheme } from "../../lib/theme";
import { useAppStore } from "../../lib/store";
import { clearCryptoKey } from "../../lib/storage";
import { attachAutoLock } from "../../lib/autolock";
import { attachAutoSync, syncOnLaunch } from "../../lib/syncOrchestrator";

export default function TabLayout() {
  const { colors } = useTheme();

  useEffect(() => {
    attachAutoLock(() => {
      clearCryptoKey();
      useAppStore.getState().clearAll();
      router.replace("/lock");
    });

    attachAutoSync();

    // Pull fresh data on launch if signed in
    syncOnLaunch().catch(() => {
      // Silently ignore — will retry on next launch
    });
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSoft,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Log",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>📝</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>📅</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="pills"
        options={{
          title: "Pills",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>💊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="chart"
        options={{
          title: "Chart",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>📊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="data"
        options={{
          title: "Data",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  );
}
