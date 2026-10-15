// ============================================================
// AUTO-LOCK
// Tracks when the app was backgrounded and, on return, decides
// whether the session should be locked based on elapsed time.
// ============================================================

import { AppState, AppStateStatus } from "react-native";

const LOCK_AFTER_MS = 5 * 60 * 1000; // 5 minutes

let backgroundedAt: number | null = null;
let listenerAttached = false;
let currentLockCallback: (() => void) | null = null;

/**
 * Call this once when the app unlocks. It attaches the AppState
 * listener and calls `onLockNeeded` if the elapsed background time
 * exceeds the threshold.
 */
export function attachAutoLock(onLockNeeded: () => void) {
  currentLockCallback = onLockNeeded;

  if (listenerAttached) return;
  listenerAttached = true;

  AppState.addEventListener("change", (next: AppStateStatus) => {
    handleStateChange(next);
  });

  // Record the current state — if the app starts in "active", we're good.
  if (
    AppState.currentState === "background" ||
    AppState.currentState === "inactive"
  ) {
    backgroundedAt = Date.now();
  }
}

function handleStateChange(next: AppStateStatus) {
  if (next === "background" || next === "inactive") {
    backgroundedAt = Date.now();
    return;
  }

  if (next === "active" && backgroundedAt !== null) {
    const elapsed = Date.now() - backgroundedAt;
    backgroundedAt = null;
    if (elapsed > LOCK_AFTER_MS && currentLockCallback) {
      currentLockCallback();
    }
  }
}

/**
 * Manually reset the timer (e.g., after a successful unlock).
 * Not strictly necessary since backgroundedAt is cleared on active,
 * but useful if you ever want to force a fresh window.
 */
export function resetAutoLock() {
  backgroundedAt = null;
}
