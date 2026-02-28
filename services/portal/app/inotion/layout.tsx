"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, BookOpen, DollarSign, Map,
  UserCircle, Server,
  MessageSquare, Menu, X, TrendingUp, Workflow,
} from "lucide-react";
import { ThemeProvider, useTheme } from "../components/inotion/ThemeProvider";
import ThemeToggle from "../components/inotion/ThemeToggle";
import GlobalSearch from "../components/inotion/GlobalSearch";

const NAV_ITEMS = [
  { href: "/inotion", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inotion/creators", label: "Creators", icon: Users },
  { href: "/inotion/agents", label: "Agents", icon: Calendar },
  { href: "/inotion/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/inotion/costs", label: "Costs", icon: DollarSign },
  { href: "/inotion/roadmap", label: "Roadmap", icon: Map },
  { href: "/inotion/comments", label: "Comments", icon: MessageSquare },
  { href: "/inotion/comments/sentiment", label: "Sentiment", icon: TrendingUp },

  { href: "/inotion/workflows", label: "Workflows", icon: Workflow },
  { href: "/inotion/infrastructure", label: "Infrastructure", icon: Server },
  { href: "/inotion/personas", label: "Personas", icon: UserCircle },
];

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isJarvis = theme === "jarvis";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-3">
            {/* Left: hamburger + logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="flex items-center gap-2">
                <a href="/" className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors hidden sm:block">
                  Portal
                </a>
                <span className="text-zinc-200 dark:text-zinc-700 hidden sm:block">/</span>
                <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  00Raiser HQ
                </span>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                      isActive
                        ? isJarvis
                          ? "jarvis-nav-active"
                          : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    <Icon size={12} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right: search + theme */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <GlobalSearch />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* ── Mobile nav drawer ── */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 max-h-[70vh] overflow-y-auto">
            <nav className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={[
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 pb-3 sm:hidden">
              <GlobalSearch />
            </div>
          </div>
        )}
      </header>

      {/* ── Content ── */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">
          <span>00Raiser Platform</span>
          <span>Autonomous AI Operations</span>
        </div>
      </footer>
    </div>
  );
}

export default function INotionLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LayoutInner>{children}</LayoutInner>
    </ThemeProvider>
  );
}
