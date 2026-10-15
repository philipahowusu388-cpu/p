// ============================================================
// SPEECH RECOGNITION
// Thin wrapper around expo-speech-recognition.
// Kept isolated so failures don't crash the app.
// ============================================================

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

/**
 * Is on-device speech recognition available?
 * Always true in a real build on Android/iOS.
 */
export function isSpeechAvailable(): boolean {
  return true;
}

/**
 * Request microphone + speech recognition permissions.
 * Returns true if both are granted.
 */
export async function requestSpeechPermission(): Promise<boolean> {
  try {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

/**
 * Start a speech recognition session.
 *
 * @param onInterim    called with partial text as user speaks
 * @param onFinal      called with a final chunk when the engine commits text
 * @param onError      called with an error message
 * @param onEnd        called when the session ends (either normally or on error)
 */
export function startSpeech(options: {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}) {
  try {
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
    });
  } catch (err) {
    options.onError?.(
      err instanceof Error ? err.message : "Could not start speech recognition",
    );
    options.onEnd?.();
  }
}

/**
 * Stop the current speech session. Safe to call if not running.
 */
export function stopSpeech() {
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch {
    // ignore
  }
}

/**
 * Abort the current speech session immediately.
 */
export function abortSpeech() {
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch {
    // ignore
  }
}

// Re-export the hook so components don't need to import from the module
export { useSpeechRecognitionEvent };
