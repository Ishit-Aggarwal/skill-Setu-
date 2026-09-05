"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-device display and notification preferences for the signed-in portals.
 *
 * Appearance is stored per device rather than on the account, because "dark"
 * is a property of where you are sitting, not of who you are — the same person
 * wants light on a bright campus terminal and dark on a laptop at night.
 * Notification and privacy preferences are account-level and live on the user
 * record instead; this module only owns the local ones.
 */

const THEME_KEY = "ayusetu:theme";
const DENSITY_KEY = "ayusetu:density";
const REDUCE_MOTION_KEY = "ayusetu:reduce-motion";

export const THEME_OPTIONS = [
  { value: "light", label: "Light", hint: "The default. Best in bright rooms and for printing." },
  { value: "dark", label: "Dark", hint: "Easier at night. Applies to your portal, not the public pages." },
  { value: "system", label: "Match my device", hint: "Follows your operating system's light/dark setting." },
];

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (typeof window === "undefined") return;
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* private browsing — the preference just won't persist */
  }
}

export function getStoredTheme() {
  const value = read(THEME_KEY, "light");
  return THEME_OPTIONS.some((o) => o.value === value) ? value : "light";
}

export function prefersDark() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolves "system" to the concrete theme currently in effect. */
export function resolveTheme(theme) {
  return theme === "system" ? (prefersDark() ? "dark" : "light") : theme;
}

/**
 * Applies the theme to <html>.
 *
 * Deliberately a document-level attribute rather than a React wrapper: modals
 * are portalled to <body>, outside the dashboard's React tree, and they must
 * pick up the same tokens. `null` clears it, which is how the marketing pages
 * stay light regardless of the preference.
 */
export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const resolved = theme == null ? null : resolveTheme(theme);
  if (resolved === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
}

export function setStoredTheme(theme) {
  write(THEME_KEY, theme);
  applyTheme(theme);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ayusetu:theme", { detail: theme }));
  }
}

export function getDensity() {
  return read(DENSITY_KEY, "comfortable");
}

export function setDensity(value) {
  write(DENSITY_KEY, value);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ayusetu:density", { detail: value }));
  }
}

export function getReduceMotion() {
  return read(REDUCE_MOTION_KEY, "false") === "true";
}

export function setReduceMotion(value) {
  write(REDUCE_MOTION_KEY, value ? "true" : "false");
  if (typeof document !== "undefined") {
    document.documentElement.toggleAttribute("data-reduce-motion", Boolean(value));
  }
}

/**
 * Keeps a component in step with the stored theme, including changes made in
 * another tab and (for "system") changes to the OS setting itself.
 */
export function useTheme({ active = true } = {}) {
  const [theme, setTheme] = useState("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(getStoredTheme());
    // Reduce-motion is a document flag too, so restore it on the same mount
    // rather than only when the switch is flipped.
    if (typeof document !== "undefined") {
      document.documentElement.toggleAttribute("data-reduce-motion", getReduceMotion());
    }
    setReady(true);
  }, []);

  /* Applied only while `active` — that is what confines dark mode to the
     portal. Unmounting the dashboard clears the attribute. */
  useEffect(() => {
    if (!ready) return undefined;
    applyTheme(active ? theme : null);
    return () => applyTheme(null);
  }, [theme, active, ready]);

  useEffect(() => {
    function onThemeEvent(e) {
      setTheme(e.detail ?? getStoredTheme());
    }
    function onStorage(e) {
      if (e.key === THEME_KEY) setTheme(getStoredTheme());
    }
    window.addEventListener("ayusetu:theme", onThemeEvent);
    window.addEventListener("storage", onStorage);

    // "Match my device" has to react to the device changing its mind.
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onMedia = () => setTheme((t) => (t === "system" ? "system" : t));
    const rerender = () => {
      if (getStoredTheme() === "system") applyTheme("system");
      onMedia();
    };
    media?.addEventListener?.("change", rerender);

    return () => {
      window.removeEventListener("ayusetu:theme", onThemeEvent);
      window.removeEventListener("storage", onStorage);
      media?.removeEventListener?.("change", rerender);
    };
  }, []);

  const update = useCallback((next) => {
    setTheme(next);
    setStoredTheme(next);
  }, []);

  return { theme, resolved: resolveTheme(theme), setTheme: update, ready };
}
