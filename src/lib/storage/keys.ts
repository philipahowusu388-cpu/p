// ============================================================
// STORAGE KEY NAMES
// ============================================================

export const GLOBAL_KEYS = {
  PROFILES: "periodTracker.profiles.v1",
  ACTIVE_PROFILE: "periodTracker.activeProfile",
  ONBOARDED: "periodTracker.onboarded",
  THEME: "periodTracker.theme",
  SCHEDULE_START: "periodTracker.scheduleStart",
  SCHEDULE_END: "periodTracker.scheduleEnd",
  LOCATION: "periodTracker.location",
  NOTIFICATIONS: "periodTracker.notifications",
  SCHEMA_VERSION: "periodTracker.schemaVersion",
} as const;

export function dataKeyFor(profileId: string, type: DataType): string {
  return `periodTracker.data.${profileId}.${type}`;
}

export type DataType =
  | "entries"
  | "notes"
  | "contraceptives"
  | "contraceptiveLog"
  | "customSymptoms"
  | "bbtUnit"
  | "notif";