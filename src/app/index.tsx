import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { loadProfiles, getActiveProfileId } from "../lib/profiles";

export default function Index() {
  const [target, setTarget] = useState<"lock" | "tabs" | null>(null);

  useEffect(() => {
    (async () => {
      const profiles = await loadProfiles();
      const activeId = await getActiveProfileId();

      if (profiles.length === 0) {
        setTarget("lock");
      } else if (activeId) {
        setTarget("lock");
      } else {
        setTarget("lock");
      }
    })();
  }, []);

  if (!target) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fdf2f8",
        }}
      >
        <ActivityIndicator size="large" color="#e88fb0" />
      </View>
    );
  }

  return <Redirect href="/lock" />;
}
