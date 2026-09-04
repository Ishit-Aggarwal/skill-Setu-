"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { findOne, insert, update, remove, getDemoUser, all, saveAll } from "./store";
import { hashPassword } from "./hash";

const AuthContext = createContext(null);
const TAB_SESSION_KEY = "ayusetu:tab_session";
const GLOBAL_SESSION_KEY = "ayusetu:session";
// Only used by the no-Convex fallback, where there is no server to email from
// and the reset link has to be handed straight back to the browser.
const LOCAL_RESET_KEY = "ayusetu:reset:";

function getActiveUserId() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TAB_SESSION_KEY) || window.localStorage.getItem(GLOBAL_SESSION_KEY);
}

/**
 * Accounts are owned by the server (Convex) so they work from any device.
 * The local store is only a per-device cache of the signed-in profile, kept
 * so the rest of the app — which still reads the local store — keeps working.
 *
 * If the server has no account database configured, we fall back to the old
 * device-local behaviour and say so loudly in the console. Email verification
 * is enforced in both modes.
 */

let warnedLocalOnly = false;
function warnLocalOnly(context) {
  if (warnedLocalOnly) return;
  warnedLocalOnly = true;
  console.warn(
    `[auth] ${context}: falling back to browser-local accounts. ` +
      "Accounts created in this mode exist ONLY in this browser and cannot be used to sign in " +
      "from another device. Configure NEXT_PUBLIC_CONVEX_URL to enable cross-device sign-in."
  );
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { res, data };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = getActiveUserId();
    if (uid) {
      const found = findOne("users", (u) => u.id === uid);
      if (found) setUser(found);
    }
    setLoading(false);
  }, []);

  function persistSession(u) {
    setUser(u);
    if (typeof window === "undefined") return;
    if (u) {
      window.sessionStorage.setItem(TAB_SESSION_KEY, u.id);
      window.localStorage.setItem(GLOBAL_SESSION_KEY, u.id);
    } else {
      window.sessionStorage.removeItem(TAB_SESSION_KEY);
      window.localStorage.removeItem(GLOBAL_SESSION_KEY);
    }
  }

  /** Cache the server-owned profile locally (upsert, so repeat sign-ins don't duplicate). */
  function mirrorUser(record) {
    const existing = findOne("users", (u) => u.id === record.id);
    if (existing) return update("users", record.id, record);
    return insert("users", record);
  }

  async function login(email, password) {
    const normalized = email.trim().toLowerCase();
    const passwordHash = await hashPassword(password);

    const { res, data } = await postJson("/api/auth/login", { email: normalized, passwordHash });

    if (res.ok && data.success) {
      const record = mirrorUser(data.user);
      persistSession(record);
      return record;
    }

    // Server has no account database — use the legacy device-local accounts.
    if (data.code === "CONVEX_NOT_CONFIGURED") {
      warnLocalOnly("Sign-in");
      const found = findOne("users", (u) => u.email.toLowerCase() === normalized);
      if (!found) throw new Error("No account found for this email. Try creating one instead.");
      if (found.passwordHash !== passwordHash) throw new Error("Incorrect password. Please try again.");
      persistSession(found);
      return found;
    }

    throw new Error(data.error || "Could not sign you in. Please try again.");
  }

  /** Step 1 of signup: email the user a verification code. Creates nothing. */
  async function sendSignupOtp(email) {
    const normalized = email.trim().toLowerCase();
    // Fast local pre-check; the authoritative duplicate check runs at registration.
    if (findOne("users", (u) => u.email.toLowerCase() === normalized)) {
      throw new Error("An account with this email already exists. Try signing in instead.");
    }
    const { res, data } = await postJson("/api/send-otp", { email: normalized });
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to send verification code.");
    return data;
  }

  /**
   * Step 2 of signup: the server re-checks the OTP and only then creates the
   * account. The session is established from the record the server returns —
   * never before verification succeeds.
   */
  async function completeSignup(profile, otp, token) {
    const normalized = profile.email.trim().toLowerCase();
    const passwordHash = await hashPassword(profile.password);
    const { password, ...safeProfile } = profile;

    const { res, data } = await postJson("/api/auth/register", {
      profile: { ...safeProfile, email: normalized, passwordHash },
      otp,
      token,
    });

    if (res.ok && data.success) {
      const record = mirrorUser(data.user);
      persistSession(record);
      return record;
    }

    if (data.code === "CONVEX_NOT_CONFIGURED") {
      warnLocalOnly("Registration");
      // Still verify the OTP before creating anything locally.
      const verify = await postJson("/api/verify-otp", { email: normalized, otp, token });
      if (!verify.res.ok || !verify.data.success) {
        throw new Error(verify.data.error || "Invalid verification code.");
      }
      const record = insert("users", {
        ...safeProfile,
        email: normalized,
        passwordHash,
        emailVerified: true,
        createdAt: new Date().toISOString(),
      });
      persistSession(record);
      return record;
    }

    throw new Error(data.error || "Invalid verification code.");
  }

  /**
   * Step 1 of password recovery.
   *
   * Returns `{ devLink }` when the server is in OTP_DEV_MODE with no mail
   * transport, so the flow stays usable offline — the same escape hatch the
   * signup OTP uses. Never reveals whether the address is registered.
   */
  async function requestPasswordReset(email) {
    const normalized = email.trim().toLowerCase();
    const { res, data } = await postJson("/api/auth/forgot-password", { email: normalized });

    if (res.ok && data.success) return data;

    if (data.code === "CONVEX_NOT_CONFIGURED") {
      warnLocalOnly("Password reset");
      const found = findOne("users", (u) => u.email?.toLowerCase() === normalized);
      // Still generic on the surface — but a local-only account can be reset
      // here because there is no server to email from.
      if (!found) return { success: true, message: "If an account exists for that address, a reset link is on its way." };
      const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
      window.localStorage.setItem(
        LOCAL_RESET_KEY + normalized,
        JSON.stringify({ token, expiresAt: Date.now() + 30 * 60 * 1000 })
      );
      return {
        success: true,
        localOnly: true,
        devLink: `/reset-password?email=${encodeURIComponent(normalized)}&token=${encodeURIComponent(token)}`,
      };
    }

    throw new Error(data.error || "Could not start a password reset. Please try again.");
  }

  /** Step 2: exchange the emailed token for a new password. */
  async function resetPassword(email, token, password) {
    const normalized = email.trim().toLowerCase();
    const passwordHash = await hashPassword(password);
    const { res, data } = await postJson("/api/auth/reset-password", { email: normalized, token, passwordHash });

    // Deliberately does NOT mirror the returned account into the local store.
    // Whoever opened the reset link is not signed in, and may not even be on
    // their own device — writing the profile here would overwrite whatever
    // account this browser is currently cached against. The subsequent sign-in
    // does the mirroring properly.
    if (res.ok && data.success) return true;

    if (data.code === "CONVEX_NOT_CONFIGURED") {
      warnLocalOnly("Password reset");
      let stored = null;
      try {
        stored = JSON.parse(window.localStorage.getItem(LOCAL_RESET_KEY + normalized) || "null");
      } catch {
        stored = null;
      }
      if (!stored || stored.token !== token) {
        throw new Error("This reset link is no longer valid. Please request a new one.");
      }
      if (Date.now() > stored.expiresAt) {
        window.localStorage.removeItem(LOCAL_RESET_KEY + normalized);
        throw new Error("This reset link has expired (30-minute validity). Please request a new one.");
      }
      const found = findOne("users", (u) => u.email?.toLowerCase() === normalized);
      if (!found) throw new Error("No account found for this email address.");
      update("users", found.id, { passwordHash });
      window.localStorage.removeItem(LOCAL_RESET_KEY + normalized);
      return true;
    }

    throw new Error(data.error || "Could not reset your password. Please try again.");
  }

  function loginAsDemo(role) {
    const demoUser = getDemoUser(role);
    persistSession(demoUser);
    return demoUser;
  }

  function updateProfile(patch) {
    if (!user) return;
    const merged = update("users", user.id, patch);
    setUser(merged);
    // Best-effort sync so the profile follows the user to their other devices.
    postJson("/api/auth/profile", { id: user.id, patch }).catch((err) =>
      console.warn("[auth] Could not sync profile to the server:", err)
    );
  }

  function logout() {
    persistSession(null);
  }

  async function deleteAccount() {
    if (!user) return;
    const uid = user.id;
    postJson("/api/auth/delete", { id: uid }).catch(() => {});
    remove("users", uid);
    if (user.role === "student") {
      try {
        const remainingApps = all("applications").filter((a) => a.studentId !== uid);
        saveAll("applications", remainingApps);
        remove("portfolios", uid);
        remove("assessments", uid);
      } catch {}
    }
    persistSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        deleteAccount,
        sendSignupOtp,
        completeSignup,
        loginAsDemo,
        updateProfile,
        requestPasswordReset,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
