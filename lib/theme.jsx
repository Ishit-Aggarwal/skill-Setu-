"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [darkMode, setDarkModeState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("ayusetu:theme") : null;
    setDarkModeState(stored === "dark");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("ayusetu:theme", darkMode ? "dark" : "light");
  }, [darkMode, ready]);

  function setDarkMode(v) {
    setDarkModeState(v);
  }

  return <ThemeContext.Provider value={{ darkMode, setDarkMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
