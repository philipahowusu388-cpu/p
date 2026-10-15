// ============================================================
// CRYPTO MODULE — WEB VERSION
// Uses the browser's native Web Crypto API directly.
// Same API surface as the native version.
// ============================================================

// Browser has crypto.getRandomValues and crypto.subtle natively.

export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BYTES = 32;

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
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)),
    );
  }
  return btoa(binary);
}

export function base64ToBytes(str: string): Uint8Array {
  const binary = atob(str);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// ============================================================
// KEY DERIVATION — Web Crypto API
// ============================================================

export async function deriveKeyPBKDF2(
  password: string,
  saltHex: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<Uint8Array> {
  const salt = hexToBytes(saltHex);
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
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
// ENCRYPT / DECRYPT — Web Crypto API
// ============================================================

export interface EncryptedPayload {
  v: number;
  iv: string;
  ct: string;
}

export function encryptJSON(value: unknown, key: Uint8Array): EncryptedPayload {
  // Synchronous version isn't possible with Web Crypto's subtle API.
  // We use a synchronous fallback for now (simple XOR is unacceptable,
  // but we only need this path for compatibility with the sync engine
  // which calls encryptJSON synchronously in some code paths).
  throw new Error("encryptJSON is async-only on web. Use encryptJSONAsync.");
}

export async function encryptJSONAsync(
  value: unknown,
  key: Uint8Array,
): Promise<EncryptedPayload> {
  const iv = randomBytes(IV_BYTES);
  const importedKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    importedKey,
    plaintext,
  );
  return {
    v: 1,
    iv: bytesToHex(iv),
    ct: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptJSONAsync<T = unknown>(
  payload: EncryptedPayload,
  key: Uint8Array,
): Promise<T> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }
  if (typeof payload.iv !== "string" || typeof payload.ct !== "string") {
    throw new Error("Malformed payload");
  }
  const iv = hexToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ct);
  const importedKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    importedKey,
    ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

export function createVerifier(key: Uint8Array): EncryptedPayload {
  // Sync createVerifier isn't possible on web.
  // Return a placeholder — callers should use createVerifierAsync.
  throw new Error("createVerifier is async-only on web.");
}

export async function createVerifierAsync(
  key: Uint8Array,
): Promise<EncryptedPayload> {
  return encryptJSONAsync({ verify: VERIFIER_PLAINTEXT }, key);
}

export function verifyKey(
  key: Uint8Array,
  verifier: EncryptedPayload,
): boolean {
  // Sync verify isn't possible on web.
  return false;
}

export async function verifyKeyAsync(
  key: Uint8Array,
  verifier: EncryptedPayload,
): Promise<boolean> {
  try {
    const out = await decryptJSONAsync<{ verify?: string }>(verifier, key);
    return out.verify === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

// ============================================================
// KDF PARAMS
// ============================================================

export interface KdfParams {
  iterations?: number;
  memoryKb?: number;
  parallelism?: number;
}

export function defaultKdfParams(): KdfParams {
  return { iterations: PBKDF2_ITERATIONS };
}
