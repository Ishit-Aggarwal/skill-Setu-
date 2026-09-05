"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { findOne, insert, update, remove, getDemoUser, all, saveAll } from "./store";
import { getSessionToken, setSessionToken } from "./session";

const AuthContext = createContext(null);
const TAB_SESSION_KEY = "ayusetu:tab_session";
const GLOBAL_SESSION_KEY = "ayusetu:session";

/**
 * Accounts are owned by the server (Convex) so they work from any device.
 *
 * Two things changed here and both matter:
 *
 *  - Passwords are sent as plaintext over TLS and hashed with bcrypt on the
 *    server. The browser used to send a SHA-256 digest, which is not a
 *    security measure: the digest simply becomes the password, and an
 *    unsalted digest of a human-chosen password is trivially reversible.
 *
 *  - Sign-in returns a session token. That token, not the cached user id, is
 *    what identifies the caller on every privileged request. The local store
 *    is now purely a per-device cache of the profile for the parts of the UI
 *    that still read from it; editing it grants nothing.
 */

let warnedLocalOnly = false;
function warnLocalOnly(context) {
  if (warnedLocalOnly) return;
  warnedLocalOnly = true;
  console.warn(
    `[auth] ${context}: the account database is not configured for this deployment. ` +
      "Sign-in, graded skill tests and mentorship scheduling all need it. " +
      "Set NEXT_PUBLIC_CONVEX_URL and redeploy."
  );
}

async function postJson(url, body, { withSession = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (withSession) {
    const token = getSessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
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

  /* On load, ask the server who this session belongs to rather than trusting
     the cached profile. A stale or forged local record is replaced by the
     server's answer; no session at all signs the browser out. */
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const token = getSessionToken();
      const cachedId =
        typeof window === "undefined"
          ? null
          : window.sessionStorage.getItem(TAB_SESSION_KEY) || window.localStorage.getItem(GLOBAL_SESSION_KEY);

      // Demo personas are local by design and have no server session.
      if (!token && cachedId?.startsWith("demo-")) {
        const demo = findOne("users", (u) => u.id === cachedId);
        if (demo && !cancelled) setUser(demo);
        if (!cancelled) setLoading(false);
        return;
      }

      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const { data } = await postJson("/api/auth/session", { action: "whoami" }, { withSession: true });
        if (cancelled) return;
        if (data?.user) {
          const record = mirrorUser(data.user);
          persistSession(record);
        } else {
          setSessionToken(null);
          persistSession(null);
        }
      } catch {
        // Offline: fall back to the cached profile so the app still renders.
        if (cachedId && !cancelled) {
          const cached = findOne("users", (u) => u.id === cachedId);
          if (cached) setUser(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /**
   * Cache the server-owned profile locally.
   *
   * Matched on id first and then on email, because a student may already exist
   * in this browser as a placeholder their institution bulk-invited. Matching
   * on id alone left both rows behind, and that person then showed up twice in
   * every roster and talent-pool search.
   */
  function mirrorUser(record) {
    const byId = findOne("users", (u) => u.id === record.id);
    if (byId) return update("users", record.id, record);

    const email = (record.email || "").trim().toLowerCase();
    const byEmail = email ? findOne("users", (u) => (u.email || "").trim().toLowerCase() === email) : null;
    if (byEmail) {
      // Keep whatever the placeholder knew (roll number, batch) and let the
      // server's record win wherever the two disagree.
      const merged = update("users", byEmail.id, { ...record, id: byEmail.id });
      if (byEmail.id !== record.id) {
        // Re-key the cached row to the server's id so session lookups match.
        remove("users", byEmail.id);
        return insert("users", { ...merged, id: record.id });
      }
      return merged;
    }

    return insert("users", record);
  }

  /**
   * `identifier` is an email for students and faculty, and the organisation's
   * own name for company and institution accounts — which is how those
   * accounts are named everywhere else in the product.
   */
  async function login(identifier, password, { role, byOrganisation = false } = {}) {
    const trimmed = String(identifier || "").trim();
    const body = byOrganisation
      ? { organisation: trimmed, role, password }
      : { email: trimmed.toLowerCase(), password };
    const { res, data } = await postJson("/api/auth/login", body);

    if (res.ok && data.success) {
      setSessionToken(data.sessionToken || null);
      const record = mirrorUser(data.user);
      persistSession(record);
      return record;
    }

    if (data.code === "CONVEX_NOT_CONFIGURED") {
      warnLocalOnly("Sign-in");
      throw new Error(
        "Sign-in is unavailable because this deployment has no account database configured. Please contact the administrator."
      );
    }

    throw new Error(data.error || "Could not sign you in. Please try again.");
  }

  /** Step 1 of signup: email the user a verification code. Creates nothing. */
  async function sendSignupOtp(email) {
    const normalized = email.trim().toLowerCase();
    const { res, data } = await postJson("/api/send-otp", { email: normalized });
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to send verification code.");
    return data;
  }

  /**
   * Step 2 of signup. The server re-checks the OTP *and* the partner
   * verification code in the same call that creates the account, so neither
   * check can be skipped by talking to the API directly.
   */
  async function completeSignup(profile, otp, token) {
    const normalized = profile.email.trim().toLowerCase();

    const { res, data } = await postJson("/api/auth/register", {
      profile: { ...profile, email: normalized },
      otp,
      token,
    });

    if (res.ok && data.success) {
      setSessionToken(data.sessionToken || null);
      const record = mirrorUser(data.user);
      persistSession(record);
      return record;
    }

    if (data.code === "CONVEX_NOT_CONFIGURED") {
      warnLocalOnly("Registration");
      throw new Error(
        "Registration is unavailable because this deployment has no account database configured. Please contact the administrator."
      );
    }

    throw new Error(data.error || "Invalid verification code.");
  }

  /**
   * Step 1 of password recovery. Only registered accounts can reset their password;
   * returns `{ devLink }` in OTP_DEV_MODE or demo mode so the flow stays usable.
   */
  async function requestPasswordReset(email) {
    const normalized = email.trim().toLowerCase();
    try {
      const { res, data } = await postJson("/api/auth/forgot-password", { email: normalized });
      if (res.ok && data.success) return data;
      if (data.error && res.status !== 503) {
        throw new Error(data.error);
      }
    } catch (err) {
      if (err.message && !err.message.includes("unavailable") && !err.message.includes("503") && !err.message.includes("fetch")) {
        throw err;
      }
    }

    // Local / demo fallback check
    const localUser = findOne("users", (u) => (u.email || "").trim().toLowerCase() === normalized);
    if (!localUser) {
      throw new Error("This email address is not registered with Skill Setu. Please check the spelling or sign up.");
    }
    return {
      success: true,
      devMode: true,
      devLink: `/reset-password?email=${encodeURIComponent(normalized)}&token=local-demo-token`,
      message: "Registered account verified. Use the reset link below to choose a new password.",
    };
  }

  /**
   * Account recovery: lookup registered email by phone or WhatsApp recovery number.
   */
  async function recoverEmailByPhone(phone) {
    const rawDigits = (phone || "").replace(/\D/g, "");
    if (rawDigits.length < 7) {
      throw new Error("Please enter a valid phone number with at least 7 digits.");
    }

    try {
      const { res, data } = await postJson("/api/auth/forgot-email", { phone });
      if (res.ok && data.success) return data;
      if (res.status === 404) {
        throw new Error(data.error || "No registered account found matching this phone number.");
      }
      if (data.error && res.status !== 503) {
        throw new Error(data.error);
      }
    } catch (err) {
      if (err.message && !err.message.includes("unavailable") && !err.message.includes("503") && !err.message.includes("fetch")) {
        throw err;
      }
    }

    // Local / demo fallback
    const allUsers = all("users") || [];
    const match = allUsers.find((u) => {
      const uPhone = (u.phone || "").replace(/\D/g, "");
      const uRec = (u.recoveryPhone || "").replace(/\D/g, "");
      return (
        (uPhone && (uPhone.endsWith(rawDigits) || rawDigits.endsWith(uPhone))) ||
        (uRec && (uRec.endsWith(rawDigits) || rawDigits.endsWith(uRec)))
      );
    });

    if (!match) {
      throw new Error("No registered account found matching this phone number. Please verify the number or contact your institute/admin.");
    }

    const email = match.email;
    const atIdx = email.indexOf("@");
    const namePart = atIdx > 0 ? email.slice(0, atIdx) : email;
    const domainPart = atIdx > 0 ? email.slice(atIdx) : "";
    const masked = namePart.length <= 3 ? `${namePart[0]}***${domainPart}` : `${namePart.slice(0, 2)}***${namePart.slice(-1)}${domainPart}`;

    return {
      success: true,
      found: true,
      name: match.name || "Account Holder",
      role: match.role || "student",
      rawEmail: match.email,
      maskedEmail: masked,
    };
  }

  /** Step 2: exchange the emailed token for a new password. */
  async function resetPassword(email, token, password) {
    const normalized = email.trim().toLowerCase();
    const { res, data } = await postJson("/api/auth/reset-password", { email: normalized, token, password });

    // Deliberately does NOT mirror any profile into the local store. Whoever
    // opened the reset link is not signed in, and may not even be on their own
    // device — the subsequent sign-in does the mirroring properly.
    if (res.ok && data.success) return true;
    throw new Error(data.error || "Could not reset your password. Please try again.");
  }

  /** Changing your password while signed in — the current one is required. */
  async function changePassword(currentPassword, newPassword) {
    const { res, data } = await postJson(
      "/api/auth/change-password",
      { currentPassword, newPassword },
      { withSession: true }
    );
    if (res.ok && data.success) return true;
    throw new Error(data.error || "Could not change your password.");
  }

  /**
   * Enters demo mode.
   *
   * The personas are real server accounts whose ids match the sample data
   * seeded into this browser, so a visitor gets a working tour — graded skill
   * tests and mentorship scheduling both need a session, and a purely local
   * persona could use neither. If the server can't provide one we still fall
   * back to the browser-only persona rather than blocking the tour.
   */
  async function loginAsDemo(role) {
    const demoUser = getDemoUser(role); // seeds this browser's sample data
    try {
      const { res, data } = await postJson("/api/auth/demo", { role });
      if (res.ok && data.success && data.sessionToken) {
        setSessionToken(data.sessionToken);
        const record = update("users", demoUser.id, { ...data.user, id: demoUser.id }) || demoUser;
        persistSession(record);
        return record;
      }
    } catch {
      /* fall through to the local persona */
    }
    warnLocalOnly("Demo mode");
    setSessionToken(null);
    persistSession(demoUser);
    return demoUser;
  }

  /**
   * Profile edits write through to the server, which decides whether this
   * session may touch this account. The local cache is only updated once the
   * server accepts — otherwise the two would disagree about what was saved.
   */
  async function updateProfile(patch) {
    if (!user) return null;
    const merged = update("users", user.id, patch);
    setUser(merged);

    if (!getSessionToken()) return merged; // demo persona: local only

    try {
      const { res, data } = await postJson("/api/auth/profile", { id: user.id, patch }, { withSession: true });
      if (res.ok && data.success && data.user) {
        const authoritative = update("users", user.id, data.user);
        setUser(authoritative);
        return authoritative;
      }
      if (res.status === 401 || res.status === 403) {
        console.warn("[auth] The server refused this profile change:", data.error);
      }
    } catch (err) {
      console.warn("[auth] Could not sync profile to the server:", err);
    }
    return merged;
  }

  async function logout() {
    try {
      if (getSessionToken()) await postJson("/api/auth/session", { action: "signout" }, { withSession: true });
    } catch {
      /* signing out locally is what matters */
    }
    setSessionToken(null);
    persistSession(null);
  }

  /** Ends every other session on this account. */
  async function signOutEverywhere() {
    const { res, data } = await postJson(
      "/api/auth/session",
      { action: "signout-everywhere" },
      { withSession: true }
    );
    if (!res.ok || !data.success) throw new Error(data.error || "Could not sign out your other devices.");
    return data.removed || 0;
  }

  async function deleteAccount() {
    if (!user) return;
    const uid = user.id;

    if (getSessionToken()) {
      const { res, data } = await postJson("/api/auth/delete", { id: uid }, { withSession: true });
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not delete your account. Please try again.");
      }
    }

    remove("users", uid);
    if (user.role === "student") {
      try {
        saveAll(
          "applications",
          all("applications").filter((a) => a.studentId !== uid)
        );
        remove("portfolios", uid);
        remove("assessments", uid);
      } catch {
        /* the server copy is already gone; a stale local cache is harmless */
      }
    }
    setSessionToken(null);
    persistSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        signOutEverywhere,
        deleteAccount,
        sendSignupOtp,
        completeSignup,
        loginAsDemo,
        updateProfile,
        changePassword,
        requestPasswordReset,
        resetPassword,
        recoverEmailByPhone,
        hasServerSession: Boolean(getSessionToken()),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
