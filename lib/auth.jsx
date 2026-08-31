"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { findOne, insert, update, getDemoUser } from "./store";
import { hashPassword } from "./hash";

const AuthContext = createContext(null);
const SESSION_KEY = "ayusetu:session";

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

  async function login(email, password) {
    const normalized = email.trim().toLowerCase();
    const found = findOne("users", (u) => u.email.toLowerCase() === normalized);
    if (!found) throw new Error("No account found for this email. Try creating one instead.");
    const hashed = await hashPassword(password);
    if (found.passwordHash !== hashed) throw new Error("Incorrect password. Please try again.");
    persistSession(found);
    return found;
  }

  async function sendSignupOtp(email) {
    const normalized = email.trim().toLowerCase();
    if (findOne("users", (u) => u.email.toLowerCase() === normalized)) {
      throw new Error("An account with this email already exists. Try signing in instead.");
    }
    const res = await fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Failed to send verification code.");
    return data;
  }

  async function completeSignup(profile, otp, token) {
    const normalized = profile.email.trim().toLowerCase();
    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized, otp, token }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Invalid verification code.");

    const passwordHash = await hashPassword(profile.password);
    const record = insert("users", {
      ...profile,
      email: normalized,
      passwordHash,
      password: undefined,
      createdAt: new Date().toISOString(),
    });
    delete record.password;
    persistSession(record);
    return record;
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
  }

  function logout() {
    persistSession(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, sendSignupOtp, completeSignup, loginAsDemo, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
