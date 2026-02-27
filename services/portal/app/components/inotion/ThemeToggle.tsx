// ThemeToggle.tsx — 3-way theme switcher: Light / Dark / Jarvis

"use client";

import { useTheme, applyTheme, type Theme } from "./ThemeProvider";
import { useEffect, useState } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────

function SunIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function BoltIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// ─── Theme options ────────────────────────────────────────────────────────────

const THEMES: { id: Theme; label: string; Icon: () => JSX.Element }[] = [
  { id: "light",  label: "Light",  Icon: () => <SunIcon /> },
  { id: "dark",   label: "Dark",   Icon: () => <MoonIcon /> },
  { id: "jarvis", label: "Jarvis", Icon: () => <BoltIcon /> },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ThemeToggle() {
  // Self-contained fallback for when used outside ThemeProvider
  const ctx = useTheme();
  const [localTheme, setLocalTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Sync with ThemeProvider if mounted (ctx.mounted), else manage ourselves
  useEffect(() => {
    if (!ctx.mounted) {
      // ThemeProvider not yet mounted — read from localStorage directly
      const saved = (localStorage.getItem("inotion-theme") as Theme | null) ?? "dark";
      setLocalTheme(saved);
      applyTheme(saved);
    } else {
      setLocalTheme(ctx.theme);
    }
    setMounted(true);
  }, [ctx.mounted, ctx.theme]);

  function pick(t: Theme) {
    if (ctx.mounted) {
      ctx.setTheme(t);
    } else {
      setLocalTheme(t);
      applyTheme(t);
      localStorage.setItem("inotion-theme", t);
    }
  }

  const active = ctx.mounted ? ctx.theme : localTheme;

  if (!mounted) return null;

  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-lg border
        bg-zinc-100 border-zinc-200
        dark:bg-zinc-800/80 dark:border-zinc-700
        jarvis:border-amber-500/30"
      aria-label="Theme switcher"
    >
      {THEMES.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => pick(id)}
            aria-pressed={isActive}
            title={`${label} theme`}
            className={[
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150",
              isActive
                ? id === "jarvis"
                  ? "bg-amber-500 text-zinc-900 shadow-sm shadow-amber-500/40"
                  : "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200",
            ].join(" ")}
          >
            <Icon />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
