// ============================================================
// PROFILES
// Manages the list of profiles on this device, the active
// profile, and profile creation / deletion / password change.
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile, EncryptedPayload } from "../types";
import {
  deriveKeyPBKDF2,
  generateSalt,
  createVerifier,
  verifyKey,
  PBKDF2_ITERATIONS,
  defaultKdfParams,
} from "./crypto";
import { loadGlobal, saveGlobal, removeGlobal } from "./storage";
import { GLOBAL_KEYS, dataKeyFor, type DataType } from "./storage/keys";

// ============================================================
// LOAD / SAVE PROFILE LIST
// ============================================================

export async function loadProfiles(): Promise<Profile[]> {
  const raw = await loadGlobal<Profile[]>(GLOBAL_KEYS.PROFILES, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidProfile);
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  await saveGlobal(GLOBAL_KEYS.PROFILES, profiles);
}

function isValidProfile(p: unknown): p is Profile {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.salt === "string" &&
    typeof o.verifier === "object" &&
    o.verifier !== null
  );
}

// ============================================================
// ACTIVE PROFILE
// ============================================================

export async function getActiveProfileId(): Promise<string | null> {
  const id = await loadGlobal<string | null>(GLOBAL_KEYS.ACTIVE_PROFILE, null);
  return typeof id === "string" ? id : null;
}

export async function setActiveProfileId(id: string | null): Promise<void> {
  if (id) {
    await saveGlobal(GLOBAL_KEYS.ACTIVE_PROFILE, id);
  } else {
    await removeGlobal(GLOBAL_KEYS.ACTIVE_PROFILE);
  }
}

export function findProfile(
  profiles: Profile[],
  id: string | null,
): Profile | null {
  if (!id) return null;
  return profiles.find((p) => p.id === id) ?? null;
}

// ============================================================
// DISPLAY HELPERS
// ============================================================

export function profileInitial(p: Profile | null): string {
  if (!p || !p.name) return "?";
  return p.name.trim().charAt(0).toUpperCase() || "?";
}

export function profileAvatarText(p: Profile | null): string {
  if (!p) return "?";
  if (p.emoji && p.emoji !== "auto") return p.emoji;
  return profileInitial(p);
}

// ============================================================
// CREATE PROFILE
// ============================================================

export interface CreateProfileInput {
  name: string;
  emoji: string;
  password: string;
}

export interface CreateProfileResult {
  profile: Profile;
  key: Uint8Array;
}

export async function createProfile(
  input: CreateProfileInput,
): Promise<CreateProfileResult> {
  const name = input.name.trim();
  if (!name) throw new Error("Profile name is required.");
  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const salt = generateSalt();
  const key = await deriveKeyPBKDF2(input.password, salt, PBKDF2_ITERATIONS);
  const verifier: EncryptedPayload = createVerifier(key);

  const profile: Profile = {
    id: `p_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    name,
    emoji: input.emoji || "auto",
    salt,
    verifier,
    kdf: "pbkdf2",
    kdfParams: defaultKdfParams(),
    createdAt: new Date().toISOString(),
  };

  return { profile, key };
}

// ============================================================
// UNLOCK PROFILE
// ============================================================

export async function unlockProfile(
  profile: Profile,
  password: string,
): Promise<
  { ok: true; key: Uint8Array } | { ok: false; reason: "wrong" | "unsupported" }
> {
  if (profile.kdf === "pbkdf2") {
    const iterations = profile.kdfParams.iterations ?? PBKDF2_ITERATIONS;
    const key = await deriveKeyPBKDF2(password, profile.salt, iterations);
    const ok = verifyKey(key, profile.verifier);
    return ok ? { ok: true, key } : { ok: false, reason: "wrong" };
  }
  return { ok: false, reason: "unsupported" };
}

// ============================================================
// DELETE PROFILE
// ============================================================

const ALL_DATA_TYPES: DataType[] = [
  "entries",
  "notes",
  "contraceptives",
  "contraceptiveLog",
  "customSymptoms",
  "bbtUnit",
  "notif",
];

export async function deleteProfile(id: string): Promise<void> {
  const profiles = await loadProfiles();
  const next = profiles.filter((p) => p.id !== id);
  await saveProfiles(next);

  const activeId = await getActiveProfileId();
  if (activeId === id) {
    await setActiveProfileId(next.length > 0 ? next[0].id : null);
  }

  for (const type of ALL_DATA_TYPES) {
    try {
      await AsyncStorage.removeItem(dataKeyFor(id, type));
    } catch {
      // ignore
    }
  }
}

// ============================================================
// ONBOARDING FLAG
// ============================================================

export async function hasOnboarded(): Promise<boolean> {
  const v = await loadGlobal<boolean>(GLOBAL_KEYS.ONBOARDED, false);
  return v === true;
}

export async function setOnboarded(): Promise<void> {
  await saveGlobal(GLOBAL_KEYS.ONBOARDED, true);
}

// ============================================================
// CHANGE PASSWORD
// ============================================================

/**
 * Change the active profile's password.
 *
 * This derives a new key from the new password, replaces the profile's
 * salt + verifier, and returns the new key. The CALLER must:
 *   1. Call setCryptoKey(newKey) to install the new key in the storage layer.
 *   2. Re-encrypt all existing data (the store's current state) with the new
 *      key by re-saving it via saveProfileData for each data type.
 *
 * If the caller fails to re-encrypt after calling this, existing blobs will
 * be undecryptable. Always back up before calling this.
 */
export async function changeProfilePassword(
  profileId: string,
  newPassword: string,
): Promise<Uint8Array> {
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const list = await loadProfiles();
  const profile = list.find((p) => p.id === profileId);
  if (!profile) throw new Error("Profile not found.");

  const newSalt = generateSalt();
  const newKey = await deriveKeyPBKDF2(newPassword, newSalt, PBKDF2_ITERATIONS);
  const newVerifier = createVerifier(newKey);

  profile.salt = newSalt;
  profile.verifier = newVerifier;
  profile.kdf = "pbkdf2";
  profile.kdfParams = defaultKdfParams();

  await saveProfiles(list);
  return newKey;
}
