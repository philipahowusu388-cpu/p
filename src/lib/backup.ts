// ============================================================
// ENCRYPTED BACKUP
// Export and import password-protected backup files.
// Uses the same crypto primitives as the app: PBKDF2 + AES-256-GCM.
// ============================================================

import type {
  PeriodEntry,
  DayNotesMap,
  Contraceptive,
  ContraceptiveLog,
} from "../types";
import {
  deriveKeyPBKDF2,
  encryptJSON,
  decryptJSON,
  generateSalt,
  PBKDF2_ITERATIONS,
} from "./crypto";

// ------------------------------------------------------------
// Backup payload format
// ------------------------------------------------------------

interface BackupPayload {
  version: 4;
  profileName: string;
  exportedAt: string;
  entries: PeriodEntry[];
  dayNotes: DayNotesMap;
  customSymptoms: string[];
  bbtUnit: "C" | "F";
  contraceptives: Contraceptive[];
  contraceptiveLog: ContraceptiveLog;
}

// Envelope format for encrypted backup
interface EncryptedBackupEnvelope {
  format: "period-tracker-encrypted-backup";
  version: 1;
  salt: string;
  verifier: { v: number; iv: string; ct: string };
  data: { v: number; iv: string; ct: string };
}

// ------------------------------------------------------------
// Export
// ------------------------------------------------------------

export interface ExportBackupInput {
  profileName: string;
  entries: PeriodEntry[];
  dayNotes: DayNotesMap;
  customSymptoms: string[];
  bbtUnit: "C" | "F";
  contraceptives: Contraceptive[];
  contraceptiveLog: ContraceptiveLog;
  password: string;
}

/**
 * Build an encrypted backup string. The output is a JSON string
 * safe to save to disk or send over the network — only the user's
 * password can decrypt it.
 */
export async function buildEncryptedBackup(
  input: ExportBackupInput,
): Promise<string> {
  if (input.password.length < 8) {
    throw new Error("Backup password must be at least 8 characters.");
  }

  const payload: BackupPayload = {
    version: 4,
    profileName: input.profileName,
    exportedAt: new Date().toISOString(),
    entries: input.entries,
    dayNotes: input.dayNotes,
    customSymptoms: input.customSymptoms,
    bbtUnit: input.bbtUnit,
    contraceptives: input.contraceptives,
    contraceptiveLog: input.contraceptiveLog,
  };

  const salt = generateSalt();
  const key = await deriveKeyPBKDF2(input.password, salt, PBKDF2_ITERATIONS);

  const verifier = encryptJSON({ verify: "backup" }, key);
  const data = encryptJSON(payload, key);

  const envelope: EncryptedBackupEnvelope = {
    format: "period-tracker-encrypted-backup",
    version: 1,
    salt,
    verifier,
    data,
  };

  return JSON.stringify(envelope, null, 2);
}

// ------------------------------------------------------------
// Import — detect format
// ------------------------------------------------------------

export type BackupFormat = "encrypted" | "legacy-plain";

/**
 * Peek at a JSON string and report whether it's an encrypted
 * backup or a plain JSON backup from an older version.
 */
export function detectBackupFormat(jsonText: string): BackupFormat {
  try {
    const parsed = JSON.parse(jsonText);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.format === "period-tracker-encrypted-backup"
    ) {
      return "encrypted";
    }
    return "legacy-plain";
  } catch {
    throw new Error("Not a valid JSON file.");
  }
}

// ------------------------------------------------------------
// Import — encrypted
// ------------------------------------------------------------

/**
 * Decrypt an encrypted backup with the given password.
 * Throws if the password is wrong or the file is corrupted.
 */
export async function decryptEncryptedBackup(
  jsonText: string,
  password: string,
): Promise<BackupPayload> {
  const env = JSON.parse(jsonText) as EncryptedBackupEnvelope;
  if (env.format !== "period-tracker-encrypted-backup") {
    throw new Error("Not an encrypted backup file.");
  }

  const key = await deriveKeyPBKDF2(password, env.salt, PBKDF2_ITERATIONS);

  // Verify the password first
  let verify: { verify?: string };
  try {
    verify = decryptJSON<{ verify?: string }>(env.verifier, key);
  } catch {
    throw new Error("Wrong password for this backup.");
  }
  if (verify.verify !== "backup") {
    throw new Error("Wrong password for this backup.");
  }

  // Decrypt the actual data
  const payload = decryptJSON<BackupPayload>(env.data, key);
  return payload;
}

// ------------------------------------------------------------
// Import — legacy plain JSON
// ------------------------------------------------------------

/**
 * Parse a legacy plain-JSON backup file (from an older app version).
 * No password required.
 */
export function parseLegacyBackup(jsonText: string): BackupPayload {
  const parsed = JSON.parse(jsonText);

  if (Array.isArray(parsed)) {
    // Very old format: just an array of entries
    return {
      version: 4,
      profileName: "Backup",
      exportedAt: new Date().toISOString(),
      entries: parsed,
      dayNotes: {},
      customSymptoms: [],
      bbtUnit: "C",
      contraceptives: [],
      contraceptiveLog: {},
    };
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.entries)) {
    throw new Error("Unrecognized backup file format.");
  }

  return {
    version: parsed.version ?? 4,
    profileName: parsed.profileName ?? "Backup",
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    entries: parsed.entries,
    dayNotes: parsed.dayNotes ?? {},
    customSymptoms: Array.isArray(parsed.customSymptoms)
      ? parsed.customSymptoms
      : [],
    bbtUnit: parsed.bbtUnit === "F" ? "F" : "C",
    contraceptives: Array.isArray(parsed.contraceptives)
      ? parsed.contraceptives
      : [],
    contraceptiveLog: parsed.contraceptiveLog ?? {},
  };
}
