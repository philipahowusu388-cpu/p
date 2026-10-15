// ============================================================
// SUPABASE AUTH
// Sign-up, sign-in, sign-out for the sync feature.
// This is separate from the profile's encryption password.
// The account password never touches the encryption key.
// ============================================================

import { supabase } from "./supabase";

export interface AuthResult {
  ok: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered")) {
    return "This email is already registered. Try signing in instead.";
  }
  if (lower.includes("invalid login")) {
    return "Incorrect email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email first.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (lower.includes("rate limit")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (lower.includes("email")) {
    return "Please enter a valid email address.";
  }
  return message;
}

// ------------------------------------------------------------
// Sign up
// ------------------------------------------------------------

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Email is required." };
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    return {
      ok: true,
      userId: data.user?.id,
      email: data.user?.email ?? trimmed,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sign-up failed.",
    };
  }
}

// ------------------------------------------------------------
// Sign in
// ------------------------------------------------------------

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Email is required." };
  if (!password) return { ok: false, error: "Password is required." };

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    if (error) return { ok: false, error: friendlyError(error.message) };
    return {
      ok: true,
      userId: data.user?.id,
      email: data.user?.email ?? trimmed,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sign-in failed.",
    };
  }
}

// ------------------------------------------------------------
// Sign out
// ------------------------------------------------------------

export async function signOut(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sign-out failed.",
    };
  }
}

// ------------------------------------------------------------
// Session
// ------------------------------------------------------------

export async function getSession(): Promise<{
  userId: string | null;
  email: string | null;
}> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { userId: null, email: null };
    return {
      userId: data.session.user.id,
      email: data.session.user.email ?? null,
    };
  } catch {
    return { userId: null, email: null };
  }
}

// ------------------------------------------------------------
// Password reset
// ------------------------------------------------------------

export async function sendPasswordReset(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Email is required." };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
    if (error) return { ok: false, error: friendlyError(error.message) };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not send reset email.",
    };
  }
}
