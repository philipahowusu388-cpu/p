import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { useAppStore } from "../lib/store";
import { setCryptoKey, clearCryptoKey } from "../lib/storage";
import {
  createProfile,
  unlockProfile,
  loadProfiles,
  saveProfiles,
  setActiveProfileId,
  getActiveProfileId,
  findProfile,
  profileAvatarText,
  hasOnboarded,
  setOnboarded,
} from "../lib/profiles";
import type { Profile } from "../types";

const EMOJI_CHOICES = ["auto", "🌷", "🌸", "🌙", "🦋", "⭐", "🌿"];

type Mode = "loading" | "onboarding-name" | "onboarding-password" | "unlock";

export default function LockScreen() {
  const params = useLocalSearchParams<{ add?: string }>();
  const addMode = params.add === "1";

  const [mode, setMode] = useState<Mode>("loading");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("auto");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadForProfile = useAppStore((s) => s.loadForProfile);

  // ---- Initial load: decide which mode ----
  useEffect(() => {
    (async () => {
      console.log("[lock] init - checking state...");
      console.log("[lock] addMode:", addMode);

      const onboarded = await hasOnboarded();
      const list = await loadProfiles();
      const id = await getActiveProfileId();

      console.log("[lock] onboarded:", onboarded);
      console.log("[lock] profiles:", list.length);
      console.log("[lock] activeId:", id);

      setProfiles(list);
      setActiveId(id);

      // Explicit add-profile request → always start onboarding
      if (addMode) {
        setMode("onboarding-name");
        return;
      }

      if (!onboarded && list.length === 0) {
        setMode("onboarding-name");
      } else if (list.length === 0) {
        setMode("onboarding-name");
      } else if (id && findProfile(list, id)) {
        setMode("unlock");
      } else {
        await setActiveProfileId(list[0].id);
        setActiveId(list[0].id);
        setMode("unlock");
      }
    })();
  }, [addMode]);

  // ---- Onboarding step 1: name ----
  async function submitName() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name.");
      return;
    }
    setMode("onboarding-password");
  }

  // ---- Onboarding step 2: password → create profile ----
  async function submitPassword() {
    setError(null);
    console.log("=== CREATE PROFILE TAPPED ===");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    // Check for duplicate names (case-insensitive) unless we're adding a
    // brand-new profile with the same name — refuse duplicates entirely.
    const trimmedName = name.trim();
    if (
      profiles.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())
    ) {
      setError("A profile with that name already exists.");
      return;
    }

    setBusy(true);
    console.log("Creating profile...");

    try {
      const t0 = Date.now();
      const { profile, key } = await createProfile({
        name: trimmedName,
        emoji,
        password,
      });
      const t1 = Date.now();
      console.log("Profile created in", t1 - t0, "ms:", profile.name);

      const updated = [...profiles, profile];
      await saveProfiles(updated);
      await setActiveProfileId(profile.id);
      await setOnboarded();

      console.log("Setting crypto key...");
      setCryptoKey(key);

      console.log("Loading profile data...");
      await loadForProfile(profile.id);
      console.log("Data loaded");

      console.log("Navigating to tabs...");
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Create profile failed:", err);
      setError(
        err instanceof Error ? err.message : "Could not create profile.",
      );
      setBusy(false);
    }
  }

  // ---- Unlock existing profile ----
  async function submitUnlock() {
    console.log("=== UNLOCK BUTTON TAPPED ===");
    setError(null);

    if (!password) {
      console.log("No password entered");
      setError("Enter your password.");
      return;
    }

    console.log("Password length:", password.length);

    const profile = findProfile(profiles, activeId);
    console.log("Profile found:", profile?.name, profile?.id);

    if (!profile) {
      setError("Profile not found. Tap below to switch.");
      return;
    }

    setBusy(true);
    console.log("Starting key derivation...");

    await new Promise((r) => setTimeout(r, 50));

    try {
      const t0 = Date.now();
      const result = await unlockProfile(profile, password);
      const t1 = Date.now();
      console.log("Key derivation took:", t1 - t0, "ms");
      console.log("Unlock result:", result.ok);

      if (!result.ok) {
        setError(
          result.reason === "wrong"
            ? "Incorrect password."
            : "Unsupported KDF.",
        );
        setBusy(false);
        return;
      }

      console.log("Setting crypto key...");
      setCryptoKey(result.key);

      console.log("Loading profile data...");
      await loadForProfile(profile.id);
      console.log("Data loaded");

      const loadErr = useAppStore.getState().loadError;
      console.log("Load error:", loadErr);

      if (loadErr) {
        clearCryptoKey();
        setError("Data could not be decrypted: " + loadErr);
        setBusy(false);
        return;
      }

      console.log("Navigating to tabs...");
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Unlock threw:", err);
      setError(err instanceof Error ? err.message : "Unlock failed.");
      setBusy(false);
    }
  }

  // ---- Switch profile ----
  async function switchProfile(id: string) {
    await setActiveProfileId(id);
    setActiveId(id);
    setPassword("");
    setError(null);
    setMode("unlock");
  }

  // ---- Cancel add-profile flow ----
  function cancelAdd() {
    // Send back to the lock screen without the add param.
    // The user will have to enter their previous profile's password.
    router.replace("/lock");
  }

  // ---- Render ----
  if (mode === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e88fb0" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {mode === "onboarding-name" && (
            <>
              <Text style={styles.icon}>🌸</Text>
              <Text style={styles.title}>
                {addMode ? "New profile" : "Welcome"}
              </Text>
              <Text style={styles.subtitle}>
                {addMode
                  ? "Give this profile a name and icon."
                  : "A private period tracker. Everything stays on this device."}
              </Text>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Me, Sarah"
                maxLength={24}
                autoFocus
              />

              <Text style={styles.label}>Icon</Text>
              <View style={styles.emojiRow}>
                {EMOJI_CHOICES.map((choice) => (
                  <Pressable
                    key={choice}
                    onPress={() => setEmoji(choice)}
                    style={[
                      styles.emojiOption,
                      emoji === choice && styles.emojiOptionActive,
                    ]}
                  >
                    <Text style={styles.emojiText}>
                      {choice === "auto" ? "A" : choice}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable style={styles.button} onPress={submitName}>
                <Text style={styles.buttonText}>Continue</Text>
              </Pressable>

              {addMode && (
                <Pressable onPress={cancelAdd} style={styles.linkRow}>
                  <Text style={styles.link}>Cancel</Text>
                </Pressable>
              )}
            </>
          )}

          {mode === "onboarding-password" && (
            <>
              <Text style={styles.icon}>🔑</Text>
              <Text style={styles.title}>Choose a password</Text>
              <Text style={styles.subtitle}>
                This password encrypts everything. If you forget it, your data
                cannot be recovered.
              </Text>

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 8 characters"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repeat password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                style={[styles.button, busy && styles.buttonDisabled]}
                onPress={submitPassword}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create profile</Text>
                )}
              </Pressable>

              {busy && (
                <Text style={styles.busyNote}>
                  Deriving encryption key… this takes a moment.
                </Text>
              )}

              <Pressable
                onPress={() => {
                  setError(null);
                  setMode("onboarding-name");
                }}
                style={styles.linkRow}
              >
                <Text style={styles.link}>Back</Text>
              </Pressable>
            </>
          )}

          {mode === "unlock" && (
            <>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profileAvatarText(findProfile(profiles, activeId))}
                </Text>
              </View>
              <Text style={styles.title}>
                {findProfile(profiles, activeId)?.name ?? "Unlock"}
              </Text>
              <Text style={styles.subtitle}>
                Enter your password to continue.
              </Text>

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                onSubmitEditing={submitUnlock}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                style={[styles.button, busy && styles.buttonDisabled]}
                onPress={submitUnlock}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Unlock</Text>
                )}
              </Pressable>

              {busy && (
                <Text style={styles.busyNote}>Deriving encryption key…</Text>
              )}

              {profiles.length > 1 && (
                <>
                  <Text style={styles.label}>Switch profile</Text>
                  <View style={styles.profileList}>
                    {profiles
                      .filter((p) => p.id !== activeId)
                      .map((p) => (
                        <Pressable
                          key={p.id}
                          style={styles.profileRow}
                          onPress={() => switchProfile(p.id)}
                        >
                          <Text style={styles.profileRowAvatar}>
                            {profileAvatarText(p)}
                          </Text>
                          <Text style={styles.profileRowName}>{p.name}</Text>
                        </Pressable>
                      ))}
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fdf2f8",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fdf2f8",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#9d4f6b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  icon: {
    fontSize: 40,
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#9d4f6b",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#8a6b76",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    color: "#6b3a4c",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#f3c9d8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: "#3b1f2b",
    backgroundColor: "#fffafc",
  },
  emojiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emojiOption: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f3c9d8",
    backgroundColor: "#fffafc",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiOptionActive: {
    borderColor: "#e88fb0",
    backgroundColor: "#fce7f0",
  },
  emojiText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9d4f6b",
  },
  button: {
    marginTop: 20,
    backgroundColor: "#e88fb0",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  busyNote: {
    marginTop: 10,
    fontSize: 12,
    color: "#8a6b76",
    textAlign: "center",
    fontStyle: "italic",
  },
  error: {
    marginTop: 12,
    color: "#c0392b",
    fontSize: 13,
  },
  linkRow: {
    marginTop: 16,
    alignItems: "center",
  },
  link: {
    color: "#9d4f6b",
    fontSize: 13,
    fontWeight: "600",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fce7f0",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#9d4f6b",
  },
  profileList: {
    marginTop: 6,
    gap: 6,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f3c9d8",
    backgroundColor: "#fffafc",
  },
  profileRowAvatar: {
    fontSize: 20,
  },
  profileRowName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b1f2b",
  },
});
