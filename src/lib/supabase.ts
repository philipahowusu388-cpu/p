// ============================================================
// SUPABASE CLIENT
// The Supabase client used for optional cloud sync.
// Data is encrypted BEFORE it's sent here — Supabase only
// sees ciphertext. The encryption key never leaves the phone.
// ============================================================

import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------

// These are public values — the anon key is designed to be
// embedded in client apps. Row Level Security in Supabase
// ensures users can only access their own data.
const SUPABASE_URL = "https://uusyktjudluzuyxlhrhl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c3lrdGp1ZGx1enV5eGxocmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNTUzOTAsImV4cCI6MjEwNzYzMTM5MH0.GK0_2Jn79B7pf9rHvXIpa7O2n3lzTHnLUc5rvZpxbok";

// ------------------------------------------------------------
// Client
// ------------------------------------------------------------

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/**
 * Returns true if a user is currently signed in to Supabase.
 */
export async function isSignedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/**
 * Get the current user ID, or null if not signed in.
 */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Get the current user's email, or null.
 */
export async function currentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
