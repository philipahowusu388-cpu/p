// ============================================================
// APP STORE
// Central state container for the current profile's data.
// ============================================================

import { create } from "zustand";
import type {
  PeriodEntry,
  DayNote,
  DayNotesMap,
  Contraceptive,
  ContraceptiveLog,
  DoseState,
} from "../../types";
import { loadProfileData, saveProfileData, hasCryptoKey } from "../storage";
import { setDose as setDosePure } from "../domain/pills";
import { today, toISO } from "../utils/dates";

// ============================================================
// NOTIFICATION SETTINGS SHAPE
// ============================================================

interface NotificationSettings {
  period: boolean;
  log: boolean;
  pill: boolean;
}

// ============================================================
// STATE SHAPE
// ============================================================

interface AppState {
  profileId: string | null;

  entries: PeriodEntry[];
  dayNotes: DayNotesMap;
  contraceptives: Contraceptive[];
  contraceptiveLog: ContraceptiveLog;
  customSymptoms: string[];
  bbtUnit: "C" | "F";

  notifPeriod: boolean;
  notifLog: boolean;
  notifPill: boolean;

  hydrated: boolean;
  loading: boolean;
  loadError: string | null;

  // Local change tracking for sync
  localUpdatedAt: string | null;

  // Lifecycle
  loadForProfile: (profileId: string) => Promise<void>;
  clearAll: () => void;

  // Period entries
  addEntry: (entry: Omit<PeriodEntry, "id">) => Promise<void>;
  removeEntry: (id: number) => Promise<void>;

  // Day notes
  setDayNote: (iso: string, note: DayNote) => Promise<void>;
  removeDayNote: (iso: string) => Promise<void>;

  // Contraceptives
  addContraceptive: (c: Omit<Contraceptive, "id">) => Promise<void>;
  updateContraceptive: (c: Contraceptive) => Promise<void>;
  removeContraceptive: (id: string) => Promise<void>;
  toggleContraceptive: (id: string) => Promise<void>;

  // Log
  markDose: (
    contraceptiveId: string,
    date: Date,
    value: DoseState | null,
  ) => Promise<void>;

  // Custom symptoms
  addCustomSymptom: (name: string) => Promise<void>;
  removeCustomSymptom: (name: string) => Promise<void>;

  // BBT
  setBbtUnit: (unit: "C" | "F") => Promise<void>;

  // Notifications
  setNotifPeriod: (enabled: boolean) => Promise<void>;
  setNotifLog: (enabled: boolean) => Promise<void>;
  setNotifPill: (enabled: boolean) => Promise<void>;

  // Sync helpers (called by the sync engine)
  replaceAll: (data: {
    entries: PeriodEntry[];
    dayNotes: DayNotesMap;
    contraceptives: Contraceptive[];
    contraceptiveLog: ContraceptiveLog;
    customSymptoms: string[];
    bbtUnit: "C" | "F";
  }) => Promise<void>;
  markSynced: () => void;
}

const MAX_CUSTOM_SYMPTOMS = 30;

export const useAppStore = create<AppState>((set, get) => ({
  profileId: null,
  entries: [],
  dayNotes: {},
  contraceptives: [],
  contraceptiveLog: {},
  customSymptoms: [],
  bbtUnit: "C",
  notifPeriod: false,
  notifLog: false,
  notifPill: false,
  hydrated: false,
  loading: false,
  loadError: null,
  localUpdatedAt: null,

  // ==========================================================
  // LIFECYCLE
  // ==========================================================

  async loadForProfile(profileId) {
    if (!hasCryptoKey()) {
      set({ loadError: "Cannot load data: app is locked." });
      return;
    }

    set({ loading: true, loadError: null });

    try {
      const [
        entries,
        dayNotes,
        contraceptives,
        contraceptiveLog,
        customSymptoms,
        bbtUnit,
        notifSettings,
      ] = await Promise.all([
        loadProfileData<PeriodEntry[]>(profileId, "entries", []),
        loadProfileData<DayNotesMap>(profileId, "notes", {}),
        loadProfileData<Contraceptive[]>(profileId, "contraceptives", []),
        loadProfileData<ContraceptiveLog>(profileId, "contraceptiveLog", {}),
        loadProfileData<string[]>(profileId, "customSymptoms", []),
        loadProfileData<"C" | "F" | null>(profileId, "bbtUnit", null),
        loadProfileData<NotificationSettings | null>(profileId, "notif", null),
      ]);

      set({
        profileId,
        entries: Array.isArray(entries) ? entries : [],
        dayNotes: dayNotes ?? {},
        contraceptives: Array.isArray(contraceptives) ? contraceptives : [],
        contraceptiveLog: contraceptiveLog ?? {},
        customSymptoms: Array.isArray(customSymptoms) ? customSymptoms : [],
        bbtUnit: bbtUnit === "C" || bbtUnit === "F" ? bbtUnit : "C",
        notifPeriod: notifSettings?.period ?? false,
        notifLog: notifSettings?.log ?? false,
        notifPill: notifSettings?.pill ?? false,
        hydrated: true,
        loading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load data.";
      set({ loading: false, loadError: message, hydrated: false });
    }
  },

  clearAll() {
    set({
      profileId: null,
      entries: [],
      dayNotes: {},
      contraceptives: [],
      contraceptiveLog: {},
      customSymptoms: [],
      bbtUnit: "C",
      notifPeriod: false,
      notifLog: false,
      notifPill: false,
      hydrated: false,
      loading: false,
      loadError: null,
      localUpdatedAt: null,
    });
  },

  // ==========================================================
  // PERIOD ENTRIES
  // ==========================================================

  async addEntry(partial) {
    const { profileId, entries } = get();
    if (!profileId) return;
    const entry: PeriodEntry = { id: Date.now(), ...partial };
    const next = [...entries, entry];
    set({ entries: next, localUpdatedAt: new Date().toISOString() });
    await saveProfileData(profileId, "entries", next);
  },

  async removeEntry(id) {
    const { profileId, entries } = get();
    if (!profileId) return;
    const next = entries.filter((e) => e.id !== id);
    set({ entries: next, localUpdatedAt: new Date().toISOString() });
    await saveProfileData(profileId, "entries", next);
  },

  // ==========================================================
  // DAY NOTES
  // ==========================================================

  async setDayNote(iso, note) {
    const { profileId, dayNotes } = get();
    if (!profileId) return;
    const next: DayNotesMap = { ...dayNotes, [iso]: note };
    set({ dayNotes: next, localUpdatedAt: new Date().toISOString() });
    await saveProfileData(profileId, "notes", next);
  },

  async removeDayNote(iso) {
    const { profileId, dayNotes } = get();
    if (!profileId) return;
    const next: DayNotesMap = { ...dayNotes };
    delete next[iso];
    set({ dayNotes: next, localUpdatedAt: new Date().toISOString() });
    await saveProfileData(profileId, "notes", next);
  },

  // ==========================================================
  // CONTRACEPTIVES
  // ==========================================================

  async addContraceptive(partial) {
    const { profileId, contraceptives } = get();
    if (!profileId) return;
    const c: Contraceptive = {
      id: `c_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      ...partial,
    };
    const next = [...contraceptives, c];
    set({ contraceptives: next, localUpdatedAt: new Date().toISOString() });
    await saveProfileData(profileId, "contraceptives", next);
  },

  async updateContraceptive(updated) {
    const { profileId, contraceptives } = get();
    if (!profileId) return;
    const next = contraceptives.map((c) => (c.id === updated.id ? updated : c));
    set({ contraceptives: next, localUpdatedAt: new Date().toISOString() });
    await saveProfileData(profileId, "contraceptives", next);
  },

  async removeContraceptive(id) {
    const { profileId, contraceptives } = get();
    if (!profileId) return;
    const next = contraceptives.filter((c) => c.id !== id);
    set({ contraceptives: next, localUpdatedAt: new Date().toISOString() });
    await saveProfileData(profileId, "contraceptives", next);
  },

  async toggleContraceptive(id) {
    const { contraceptives, updateContraceptive } = get();
    const c = contraceptives.find((x) => x.id === id);
    if (!c) return;
    await updateContraceptive({ ...c, active: !c.active });
  },

  // ==========================================================
  // DOSE LOG
  // ==========================================================

  async markDose(contraceptiveId, date, value) {
    const { profileId, contraceptiveLog } = get();
    if (!profileId) return;
    const next = setDosePure(contraceptiveLog, contraceptiveId, date, value);
    set({ contraceptiveLog: next, localUpdatedAt: new Date().toISOString() });
    await saveProfileData(profileId, "contraceptiveLog", next);
  },

  // ==========================================================
  // CUSTOM SYMPTOMS
  // ==========================================================

  async addCustomSymptom(name) {
    const { profileId, customSymptoms } = get();
    if (!profileId) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (customSymptoms.length >= MAX_CUSTOM_SYMPTOMS) return;
    if (customSymptoms.some((s) => s.toLowerCase() === trimmed.toLowerCase()))
      return;
    const next = [...customSymptoms, trimmed];
    set({ customSymptoms: next, localUpdatedAt: new Date().toISOString() });
    await saveProfileData(profileId, "customSymptoms", next);
  },

  async removeCustomSymptom(name) {
    const { profileId, customSymptoms } = get();
    if (!profileId) return;
    const next = customSymptoms.filter((s) => s !== name);
    set({ customSymptoms: next, localUpdatedAt: new Date().toISOString() });
    await saveProfileData(profileId, "customSymptoms", next);
  },

  // ==========================================================
  // SETTINGS
  // ==========================================================

  async setBbtUnit(unit) {
    const { profileId } = get();
    if (!profileId) return;
    set({ bbtUnit: unit, localUpdatedAt: new Date().toISOString() });
    await saveProfileData(profileId, "bbtUnit", unit);
  },

  async setNotifPeriod(enabled) {
    const { profileId, notifLog, notifPill } = get();
    if (!profileId) return;
    set({ notifPeriod: enabled });
    await saveProfileData(profileId, "notif", {
      period: enabled,
      log: notifLog,
      pill: notifPill,
    });
  },

  async setNotifLog(enabled) {
    const { profileId, notifPeriod, notifPill } = get();
    if (!profileId) return;
    set({ notifLog: enabled });
    await saveProfileData(profileId, "notif", {
      period: notifPeriod,
      log: enabled,
      pill: notifPill,
    });
  },

  async setNotifPill(enabled) {
    const { profileId, notifPeriod, notifLog } = get();
    if (!profileId) return;
    set({ notifPill: enabled });
    await saveProfileData(profileId, "notif", {
      period: notifPeriod,
      log: notifLog,
      pill: enabled,
    });
  },

  // ==========================================================
  // SYNC HELPERS
  // ==========================================================

  async replaceAll(data) {
    const { profileId } = get();
    if (!profileId) return;

    set({
      entries: data.entries,
      dayNotes: data.dayNotes,
      contraceptives: data.contraceptives,
      contraceptiveLog: data.contraceptiveLog,
      customSymptoms: data.customSymptoms,
      bbtUnit: data.bbtUnit,
    });

    await saveProfileData(profileId, "entries", data.entries);
    await saveProfileData(profileId, "notes", data.dayNotes);
    await saveProfileData(profileId, "contraceptives", data.contraceptives);
    await saveProfileData(profileId, "contraceptiveLog", data.contraceptiveLog);
    await saveProfileData(profileId, "customSymptoms", data.customSymptoms);
    await saveProfileData(profileId, "bbtUnit", data.bbtUnit);
  },

  markSynced() {
    set({ localUpdatedAt: new Date().toISOString() });
  },
}));

export function todayISO(): string {
  return toISO(today());
}
