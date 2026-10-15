// ============================================================
// THEME
// Two color palettes (light + dark) and a runtime theme system.
// Components read colors via the useTheme() hook.
// ============================================================

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useSystemColorScheme } from "react-native";

// ------------------------------------------------------------
// Palettes
// ------------------------------------------------------------

export const lightColors = {
  bg: "#fdf2f8",
  surface: "#ffffff",
  surfaceAlt: "#fffafc",
  border: "#f3c9d8",
  borderSoft: "#f7e3eb",

  text: "#3b1f2b",
  textMuted: "#8a6b76",
  textLabel: "#6b3a4c",

  accent: "#e88fb0",
  accentHover: "#d97aa0",
  accentSoft: "#fce7f0",
  accentDeep: "#9d4f6b",

  danger: "#c0392b",
  dangerBorder: "#f0b8b0",
  dangerBg: "#fdecea",

  fertile: "#c7e8c9",
  ovulation: "#7cc47f",
  note: "#b39ddb",

  flowLight: "#f7c9dc",
  flowMedium: "#e88fb0",
  flowHeavy: "#c96b8f",
} as const;

export const darkColors = {
  bg: "#1a1218",
  surface: "#241a20",
  surfaceAlt: "#2c2028",
  border: "#4a3440",
  borderSoft: "#3a2a34",

  text: "#f4e6ec",
  textMuted: "#b8a0ab",
  textLabel: "#d6bcc7",

  accent: "#e88fb0",
  accentHover: "#f0a3bf",
  accentSoft: "#3a2632",
  accentDeep: "#f0a3bf",

  danger: "#ff8a80",
  dangerBorder: "#5a3230",
  dangerBg: "#3a2422",

  fertile: "#35553a",
  ovulation: "#4f8a52",
  note: "#7e6bb0",

  flowLight: "#7e4a5e",
  flowMedium: "#e88fb0",
  flowHeavy: "#f0a3bf",
} as const;

export type ThemeColors = typeof lightColors;

// Legacy export for components that import `colors` directly.
// In dark mode they'd get the light values — but all our components
// will migrate to useTheme(). Kept for backward compatibility.
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  pill: 999,
} as const;

// ------------------------------------------------------------
// Theme preference
// ------------------------------------------------------------

export type ThemePreference = "light" | "dark" | "auto";

const THEME_KEY = "periodTracker.themePref";

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const v = await AsyncStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {}
  return "auto";
}

export async function saveThemePreference(pref: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, pref);
  } catch {}
}

// ------------------------------------------------------------
// Context
// ------------------------------------------------------------

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  scheme: "light",
  preference: "auto",
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("auto");

  // Load the stored preference on mount
  useEffect(() => {
    (async () => {
      const pref = await loadThemePreference();
      setPreferenceState(pref);
    })();
  }, []);

  const scheme: "light" | "dark" =
    preference === "auto"
      ? (systemScheme === "dark" ? "dark" : "light")
      : preference;

  const activeColors = scheme === "dark" ? darkColors : lightColors;

  async function setPreference(pref: ThemePreference) {
    setPreferenceState(pref);
    await saveThemePreference(pref);
  }

  return (
    <ThemeContext.Provider
      value={{ colors: activeColors, scheme, preference, setPreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}