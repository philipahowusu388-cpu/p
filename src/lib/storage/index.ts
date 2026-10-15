// ============================================================
// ENCRYPTED STORAGE LAYER
// Wraps AsyncStorage with AES-GCM encryption.
// Every read/write goes through our crypto module.
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import { encryptJSON, decryptJSON } from "../crypto";
import type { EncryptedPayload } from "../../types";
import { dataKeyFor, GLOBAL_KEYS, type DataType } from "./keys";
import { cryptoKeyRef } from "./cryptoKeyRef";

// ============================================================
// CURRENT SCHEMA VERSION
// ============================================================

export const SCHEMA_VERSION = 1;

// ============================================================
// KEY STATE (in-memory for the current session)
// ============================================================

let cryptoKey: Uint8Array | null = null;

/**
 * Set the key used for encrypting/decrypting data.
 * Called after successful unlock. Also updates the shared
 * cryptoKeyRef so the sync engine can access the key.
 */
export function setCryptoKey(key: Uint8Array): void {
  cryptoKey = key;
  cryptoKeyRef.set(key);
}

/**
 * Clear the key. After this, all reads/writes will throw.
 * Called on lock or profile switch.
 */
export function clearCryptoKey(): void {
  cryptoKey = null;
  cryptoKeyRef.set(null);
}

/**
 * Check whether a key is currently loaded.
 */
export function hasCryptoKey(): boolean {
  return cryptoKey !== null;
}

function requireKey(): Uint8Array {
  if (!cryptoKey) {
    throw new Error(
      "Crypto key not set. Call setCryptoKey() after successful unlock.",
    );
  }
  return cryptoKey;
}

// ============================================================
// SERIALIZED WRITE QUEUE
// ============================================================

let writeChain: Promise<void> = Promise.resolve();

function enqueueWrite(operation: () => Promise<void>): Promise<void> {
  const next = writeChain.then(operation, operation);
  writeChain = next.catch(() => {
    // swallow chain errors — callers handle their own
  });
  return next;
}

// ============================================================
// PER-PROFILE ENCRYPTED DATA
// ============================================================

/**
 * Load and decrypt a value for the given profile and data type.
 */
export async function loadProfileData<T>(
  profileId: string,
  type: DataType,
  fallback: T,
): Promise<T> {
  const key = requireKey();
  const storageKey = dataKeyFor(profileId, type);
  const raw = await AsyncStorage.getItem(storageKey);
  if (raw === null) return fallback;

  let payload: EncryptedPayload;
  try {
    payload = JSON.parse(raw) as EncryptedPayload;
  } catch {
    throw new Error(
      `Stored data for "${type}" is not valid JSON. Data may be corrupted.`,
    );
  }

  try {
    return decryptJSON<T>(payload, key);
  } catch {
    throw new Error(
      `Failed to decrypt "${type}". The data may be corrupted or encrypted with a different password.`,
    );
  }
}

/**
 * Encrypt and save a value for the given profile and data type.
 */
export function saveProfileData(
  profileId: string,
  type: DataType,
  value: unknown,
): Promise<void> {
  return enqueueWrite(async () => {
    const key = requireKey();
    const storageKey = dataKeyFor(profileId, type);
    const payload = encryptJSON(value, key);
    await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
  });
}

/**
 * Remove stored data for the given profile and data type.
 */
export function removeProfileData(
  profileId: string,
  type: DataType,
): Promise<void> {
  return enqueueWrite(async () => {
    const storageKey = dataKeyFor(profileId, type);
    await AsyncStorage.removeItem(storageKey);
  });
}

// ============================================================
// UNENCRYPTED GLOBAL DATA
// ============================================================

export async function loadGlobal<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveGlobal(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeGlobal(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// ============================================================
// RE-EXPORTS
// ============================================================

export { GLOBAL_KEYS, dataKeyFor, type DataType };
