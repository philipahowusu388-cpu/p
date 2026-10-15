// ============================================================
// SHARED TYPES
// ============================================================

/**
 * A logged period entry.
 * - `id`: unique number (we use timestamps when creating new entries)
 * - `startDate`: ISO date string (YYYY-MM-DD)
 * - `endDate`: ISO date string or null
 * - `notes`: free text or null
 * - `symptoms`: list of symptom names (built-in + custom)
 */
export interface PeriodEntry {
  id: number;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  symptoms: string[];
}

/**
 * Flow intensity for a single day.
 */
export type FlowLevel = "light" | "medium" | "heavy";

/**
 * Mood for a single day.
 */
export type MoodLevel = "awful" | "meh" | "good" | "great";

/**
 * Energy level for a single day.
 */
export type EnergyLevel = "low" | "medium" | "high";

/**
 * A note attached to a specific calendar day.
 * Every field is optional — a day might have only a note, only a mood, etc.
 */
export interface DayNote {
  note: string;
  flow: FlowLevel | null;
  /** Body basal temperature, stored in Celsius internally */
  bbt: number | null;
  mood: MoodLevel | null;
  energy: EnergyLevel | null;
  /** Number of cups of water (0–12) */
  water: number | null;
}

/**
 * Map of ISO date -> DayNote.
 */
export type DayNotesMap = Record<string, DayNote>;

/**
 * Schedule for a contraceptive.
 */
export type ContraceptiveScheduleType = "daily" | "weekly" | "custom";

export interface ContraceptiveSchedule {
  type: ContraceptiveScheduleType;
  /** Day-of-week indices (0 = Sunday, 6 = Saturday). Empty for "daily". */
  days: number[];
  /** Time in 24-hour "HH:MM" format */
  time: string;
}

/**
 * A contraceptive medication / device.
 */
export interface Contraceptive {
  id: string;
  name: string;
  schedule: ContraceptiveSchedule;
  /** ISO date (YYYY-MM-DD) when the user started this contraceptive */
  startedAt: string;
  active: boolean;
  /** Hex color like "#e88fb0" */
  color: string;
}

/**
 * Per-day, per-contraceptive log entry.
 * Example: { "2026-10-09": { "c_123": "taken", "c_456": "skipped" } }
 */
export type DoseState = "taken" | "skipped";

export type ContraceptiveLog = Record<string, Record<string, DoseState>>;

/**
 * User profile (one per person using the app on this device).
 */
export interface Profile {
  id: string;
  name: string;
  /** Emoji string, or "auto" to use the first letter */
  emoji: string;
  /** Salt for key derivation, hex string */
  salt: string;
  /** Encrypted verifier payload — proves the password is correct */
  verifier: EncryptedPayload;
  /** KDF used to derive the key from the password */
  kdf: "pbkdf2" | "argon2id";
  /** KDF-specific parameters (iterations for PBKDF2, etc.) */
  kdfParams: KdfParams;
  createdAt: string;
}

export interface KdfParams {
  iterations?: number;
  memoryKb?: number;
  parallelism?: number;
}

/**
 * The encrypted payload shape we store in AsyncStorage.
 * - `iv`: initialization vector, hex string
 * - `ct`: ciphertext, base64-encoded
 * - `v`: format version
 */
export interface EncryptedPayload {
  v: number;
  iv: string;
  ct: string;
}

/**
 * Prediction output from computePredictions().
 */
export interface Predictions {
  cycle: number;
  periodLen: number;
  nextStart: Date;
  nextEnd: Date;
  nextStartEarly: Date;
  nextStartLate: Date;
  ovulation: Date;
  fertileStart: Date;
  fertileEnd: Date;
  confidence: Confidence;
}

export interface Confidence {
  score: number;
  label: "low" | "medium" | "high";
  rangeDays: number;
}

/**
 * Cycle phase output from computePhase().
 */
export interface CyclePhase {
  phase: "menstrual" | "follicular" | "ovulation" | "luteal";
  label: string;
  emoji: string;
  desc: string;
  cls: string;
}

/**
 * Streak stats.
 */
export interface Streaks {
  current: number;
  best: number;
}

/**
 * Milestone badge.
 */
export interface Milestone {
  days: number;
  label: string;
  emoji: string;
  earned: boolean;
}

/**
 * Insight card shown on the Log tab.
 */
export interface Insight {
  icon: string;
  text: string;
}
