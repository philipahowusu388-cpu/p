// ============================================================
// SYNC ORCHESTRATOR
// Coordinates pushes and pulls based on the current state.
// Called on app launch and after local changes.
// ============================================================

import { useAppStore } from "./store";
import { hasCryptoKey } from "./storage";
import { cryptoKeyRef } from "./storage/cryptoKeyRef";
import { syncNow, pullSync, pushSync } from "./syncEngine";
import { getSession } from "./syncAuth";

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let subscriberAttached = false;
let lastLocalUpdatedAt: string | null = null;

// ------------------------------------------------------------
// On launch
// ------------------------------------------------------------

export async function syncOnLaunch(): Promise<void> {
  if (!hasCryptoKey()) return;
  const key = cryptoKeyRef.get();
  if (!key) return;

  const { userId } = await getSession();
  if (!userId) return;

  const state = useAppStore.getState();
  const localBlob = {
    entries: state.entries,
    dayNotes: state.dayNotes,
    contraceptives: state.contraceptives,
    contraceptiveLog: state.contraceptiveLog,
    customSymptoms: state.customSymptoms,
    bbtUnit: state.bbtUnit,
  };

  const result = await syncNow(localBlob, key, state.localUpdatedAt);

  if (result.ok && result.action === "pulled") {
    const pulled = await pullSync(key);
    if (pulled.data) {
      await useAppStore.getState().replaceAll(pulled.data);
      useAppStore.getState().markSynced();
    }
  } else if (result.ok && result.action === "pushed") {
    useAppStore.getState().markSynced();
  }
}

// ------------------------------------------------------------
// Debounced push on data change
// ------------------------------------------------------------

export function schedulePush(): void {
  if (!hasCryptoKey()) return;

  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    pushTimer = null;

    const key = cryptoKeyRef.get();
    if (!key) return;

    const { userId } = await getSession();
    if (!userId) return;

    const state = useAppStore.getState();
    const localBlob = {
      entries: state.entries,
      dayNotes: state.dayNotes,
      contraceptives: state.contraceptives,
      contraceptiveLog: state.contraceptiveLog,
      customSymptoms: state.customSymptoms,
      bbtUnit: state.bbtUnit,
    };

    await pushSync(localBlob, key);
    useAppStore.getState().markSynced();
  }, 3000);
}

// ------------------------------------------------------------
// Force immediate push
// ------------------------------------------------------------

export async function forcePush(): Promise<{ ok: boolean; error?: string }> {
  const key = cryptoKeyRef.get();
  if (!key) return { ok: false, error: "App is locked." };

  const { userId } = await getSession();
  if (!userId) return { ok: false, error: "Not signed in to sync." };

  const state = useAppStore.getState();
  const localBlob = {
    entries: state.entries,
    dayNotes: state.dayNotes,
    contraceptives: state.contraceptives,
    contraceptiveLog: state.contraceptiveLog,
    customSymptoms: state.customSymptoms,
    bbtUnit: state.bbtUnit,
  };

  const result = await pushSync(localBlob, key);
  if (result.ok) useAppStore.getState().markSynced();
  return { ok: result.ok, error: result.error };
}

// ------------------------------------------------------------
// Auto-subscribe to store changes
// ------------------------------------------------------------

/**
 * Watch the store for data changes and schedule a debounced push.
 * Call this once after unlock (e.g., in the tabs layout).
 */
export function attachAutoSync(): void {
  if (subscriberAttached) return;
  subscriberAttached = true;

  // Initialize the last-known marker
  lastLocalUpdatedAt = useAppStore.getState().localUpdatedAt;

  useAppStore.subscribe((state) => {
    if (state.localUpdatedAt !== lastLocalUpdatedAt) {
      lastLocalUpdatedAt = state.localUpdatedAt;
      // Schedule a push
      schedulePush();
    }
  });
}
