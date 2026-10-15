// ============================================================
// SYNC ENGINE
// Encrypted backup/restore to Supabase.
// The server only ever sees a single encrypted blob per user.
// The encryption key never leaves the phone.
// ============================================================

import { supabase } from "./supabase";
import { encryptJSON, decryptJSON, type EncryptedPayload } from "./crypto";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface SyncBlob {
  // The entire app state, serialised as JSON and then encrypted
  entries: unknown[];
  dayNotes: Record<string, unknown>;
  contraceptives: unknown[];
  contraceptiveLog: Record<string, unknown>;
  customSymptoms: string[];
  bbtUnit: "C" | "F";
}

export interface SyncResult {
  ok: boolean;
  action?: "pushed" | "pulled" | "noop" | "error";
  error?: string;
  serverUpdatedAt?: string;
}

// ------------------------------------------------------------
// Push
// ------------------------------------------------------------

/**
 * Encrypt the current store and upsert it to Supabase for the
 * currently signed-in user.
 */
export async function pushSync(
  data: SyncBlob,
  key: Uint8Array,
): Promise<SyncResult> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return { ok: false, action: "error", error: "Not signed in." };

    const encrypted = encryptJSON(data, key);

    const { error } = await supabase.from("user_data").upsert(
      {
        user_id: userId,
        encrypted_blob: JSON.stringify(encrypted),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) return { ok: false, action: "error", error: error.message };
    return { ok: true, action: "pushed" };
  } catch (err) {
    return {
      ok: false,
      action: "error",
      error: err instanceof Error ? err.message : "Push failed.",
    };
  }
}

// ------------------------------------------------------------
// Pull
// ------------------------------------------------------------

/**
 * Fetch the encrypted blob from Supabase and decrypt it.
 * Returns null if no remote data exists yet.
 */
export async function pullSync(
  key: Uint8Array,
): Promise<{
  data: SyncBlob | null;
  updatedAt: string | null;
  error?: string;
}> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId)
      return { data: null, updatedAt: null, error: "Not signed in." };

    const { data, error } = await supabase
      .from("user_data")
      .select("encrypted_blob, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return { data: null, updatedAt: null, error: error.message };
    if (!data) return { data: null, updatedAt: null };

    const encrypted = JSON.parse(data.encrypted_blob) as EncryptedPayload;
    const decrypted = decryptJSON<SyncBlob>(encrypted, key);

    return { data: decrypted, updatedAt: data.updated_at };
  } catch (err) {
    return {
      data: null,
      updatedAt: null,
      error: err instanceof Error ? err.message : "Pull failed.",
    };
  }
}

// ------------------------------------------------------------
// Get server timestamp only
// ------------------------------------------------------------

/**
 * Fast check: does the server have data for this user, and when
 * was it last updated? Doesn't decrypt anything.
 */
export async function getServerTimestamp(): Promise<{
  exists: boolean;
  updatedAt: string | null;
  error?: string;
}> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId)
      return { exists: false, updatedAt: null, error: "Not signed in." };

    const { data, error } = await supabase
      .from("user_data")
      .select("updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return { exists: false, updatedAt: null, error: error.message };
    if (!data) return { exists: false, updatedAt: null };
    return { exists: true, updatedAt: data.updated_at };
  } catch (err) {
    return {
      exists: false,
      updatedAt: null,
      error: err instanceof Error ? err.message : "Check failed.",
    };
  }
}

// ------------------------------------------------------------
// Convenience: full sync cycle
// ------------------------------------------------------------

/**
 * Full sync: fetch server timestamp, decide whether to push or pull,
 * and do it. This is the smart entry point called from the app on
 * startup and on data change.
 *
 * @param localBlob - the current in-memory store
 * @param key - the profile's encryption key
 * @param localUpdatedAt - ISO timestamp of the last local change
 *   (or null if there has never been a local change)
 */
export async function syncNow(
  localBlob: SyncBlob,
  key: Uint8Array,
  localUpdatedAt: string | null,
): Promise<SyncResult> {
  const server = await getServerTimestamp();

  if (server.error) return { ok: false, action: "error", error: server.error };

  if (!server.exists) {
    // No remote data yet — push
    return pushSync(localBlob, key);
  }

  // Compare timestamps
  const serverTime = server.updatedAt
    ? new Date(server.updatedAt).getTime()
    : 0;
  const localTime = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0;

  if (serverTime > localTime) {
    // Server is newer — pull
    const pulled = await pullSync(key);
    if (pulled.error)
      return { ok: false, action: "error", error: pulled.error };
    return {
      ok: true,
      action: "pulled",
      serverUpdatedAt: pulled.updatedAt ?? undefined,
    };
  }

  if (localTime > serverTime) {
    // Local is newer — push
    return pushSync(localBlob, key);
  }

  // Equal (or both null) — do nothing
  return { ok: true, action: "noop" };
}
