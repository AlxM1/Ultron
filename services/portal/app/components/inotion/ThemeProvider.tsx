"use client";

// ─── ThemeProvider — three-theme system ──────────────────────────────────────
// Themes: "light" | "dark" | "jarvis"
//   light  → clean white / subtle grays (Notion/Linear style)
//   dark   → deep zinc/slate, crisp contrast (Vercel/GitHub dark)
//   jarvis → dark + amber/orange accents, sci-fi (JARVIS-inspired)
//
// Theme is persisted in localStorage under "inotion-theme".
// Applied by toggling classes on <html>:
//   light  → no classes
//   dark   → "dark"
//   jarvis → "dark jarvis"

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark" | "jarvis";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  mounted: false,
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Apply a theme by manipulating <html> classes */
export function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove("dark", "jarvis");
  if (theme === "dark") {
    html.classList.add("dark");
  } else if (theme === "jarvis") {
    html.classList.add("dark", "jarvis");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("inotion-theme") as Theme | null) ?? "dark";
    setThemeState(saved);
    applyTheme(saved);
    setMounted(true);
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    applyTheme(t);
    localStorage.setItem("inotion-theme", t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}
