// ============================================================
// CRYPTO KEY REFERENCE
// Shared accessor for the in-memory crypto key.
// Set by setCryptoKey() in storage/index.ts.
// Read by the sync engine so it doesn't need direct access
// to the private module variable.
// ============================================================

let key: Uint8Array | null = null;

export const cryptoKeyRef = {
  set(newKey: Uint8Array | null) {
    key = newKey;
  },
  get(): Uint8Array | null {
    return key;
  },
};
