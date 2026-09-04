"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { findOne, insert, update, remove, getDemoUser, all, saveAll } from "./store";
import { hashPassword } from "./hash";

const AuthContext = createContext(null);
const SESSION_KEY = "ayusetu:session";

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
    const uid = window.localStorage.getItem(SESSION_KEY);
    if (uid) {
      const found = findOne("users", (u) => u.id === uid);
      if (found) setUser(found);
    }
    setLoading(false);
  }, []);

  function persistSession(u) {
    setUser(u);
    if (u) window.localStorage.setItem(SESSION_KEY, u.id);
    else window.localStorage.removeItem(SESSION_KEY);
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
    <AuthContext.Provider value={{ user, loading, login, logout, deleteAccount, sendSignupOtp, completeSignup, loginAsDemo, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
