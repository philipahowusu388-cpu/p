// ============================================================
// CRYPTO MODULE
// Native PBKDF2-SHA256 (600k iterations) via react-native-quick-crypto
// AES-256-GCM for authenticated encryption
// ============================================================

import "react-native-get-random-values";
import QuickCrypto from "react-native-quick-crypto";
import { gcm } from "@noble/ciphers/aes.js";
import { utf8ToBytes, bytesToUtf8 } from "@noble/ciphers/utils.js";
import type { EncryptedPayload, KdfParams } from "../../types";

// ============================================================
// CONSTANTS
// ============================================================

export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BYTES = 32; // AES-256

const VERIFIER_PLAINTEXT = "period-tracker-v2";

// ============================================================
// RANDOM BYTES
// ============================================================

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

// ============================================================
// ENCODING HELPERS
// ============================================================

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Hex string has odd length");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(hex.substr(i * 2, 2), 16);
    if (Number.isNaN(byte)) throw new Error("Invalid hex string");
    out[i] = byte;
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    const b2 = i < bytes.length ? bytes[i++] : NaN;
    const b3 = i < bytes.length ? bytes[i++] : NaN;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    const enc3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    const enc4 = isNaN(b3) ? 64 : b3 & 63;

    out += chars.charAt(enc1);
    out += chars.charAt(enc2);
    out += enc3 === 64 ? "=" : chars.charAt(enc3);
    out += enc4 === 64 ? "=" : chars.charAt(enc4);
  }
  return out;
}

export function base64ToBytes(str: string): Uint8Array {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  let len = str.length;
  while (len > 0 && str[len - 1] === "=") len--;

  const outLen = (len * 3) >> 2;
  const out = new Uint8Array(outLen);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = lookup[str.charCodeAt(i)];
    const e2 = lookup[str.charCodeAt(i + 1)];
    const e3 = i + 2 < len ? lookup[str.charCodeAt(i + 2)] : 0;
    const e4 = i + 3 < len ? lookup[str.charCodeAt(i + 3)] : 0;

    out[p++] = (e1 << 2) | (e2 >> 4);
    if (p < outLen) out[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < outLen) out[p++] = ((e3 & 3) << 6) | e4;
  }
  return out;
}

// ============================================================
// KEY DERIVATION — NATIVE PBKDF2
// ============================================================

/**
 * Derive a 32-byte AES key from a password using native PBKDF2-SHA256.
 * Uses OpenSSL via react-native-quick-crypto — dramatically faster
 * than pure-JS. 600k iterations complete in ~200-500ms.
 */
export async function deriveKeyPBKDF2(
  password: string,
  saltHex: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<Uint8Array> {
  const salt = hexToBytes(saltHex);

  const enc = new TextEncoder();
  const baseKey = await QuickCrypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derived = await QuickCrypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    KEY_BYTES * 8,
  );

  return new Uint8Array(derived);
}

export function generateSalt(): string {
  return bytesToHex(randomBytes(SALT_BYTES));
}

// ============================================================
// ENCRYPT / DECRYPT
// ============================================================

export function encryptJSON(value: unknown, key: Uint8Array): EncryptedPayload {
  const iv = randomBytes(IV_BYTES);
  const plaintext = utf8ToBytes(JSON.stringify(value));
  const aes = gcm(key, iv);
  const ciphertext = aes.encrypt(plaintext);
  return {
    v: 1,
    iv: bytesToHex(iv),
    ct: bytesToBase64(ciphertext),
  };
}

export function decryptJSON<T = unknown>(
  payload: EncryptedPayload,
  key: Uint8Array,
): T {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }
  if (typeof payload.iv !== "string" || typeof payload.ct !== "string") {
    throw new Error("Malformed payload: missing iv or ct");
  }
  const iv = hexToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ct);
  const aes = gcm(key, iv);
  const plaintext = aes.decrypt(ciphertext);
  return JSON.parse(bytesToUtf8(plaintext)) as T;
}

// ============================================================
// VERIFIER
// ============================================================

export function createVerifier(key: Uint8Array): EncryptedPayload {
  return encryptJSON({ verify: VERIFIER_PLAINTEXT }, key);
}

export function verifyKey(
  key: Uint8Array,
  verifier: EncryptedPayload,
): boolean {
  try {
    const out = decryptJSON<{ verify?: string }>(verifier, key);
    return out.verify === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

// ============================================================
// KDF PARAMS
// ============================================================

export function defaultKdfParams(): KdfParams {
  return { iterations: PBKDF2_ITERATIONS };
}
