"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar, BookOpen, DollarSign, Map, Radar, BarChart3, Brain, UserCircle, GitCompare } from "lucide-react";
import { ThemeProvider, useTheme } from "../components/inotion/ThemeProvider";
import ThemeToggle from "../components/inotion/ThemeToggle";
import GlobalSearch from "../components/inotion/GlobalSearch";
import StatsCards from "../components/inotion/StatsCards";
import PortalCalendar from "../components/inotion/PortalCalendar";
import HealthPanel from "../components/inotion/HealthPanel";
import ActivityHeatmap from "../components/inotion/ActivityHeatmap";
import type { AgentJob } from "../components/inotion/PortalCalendar";

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/inotion", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inotion/creators", label: "Creators", icon: Users },
  { href: "/inotion/creators/analytics", label: "Creator Analytics", icon: BarChart3 },
  { href: "/inotion/agents", label: "Agents", icon: Calendar },
  { href: "/inotion/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/inotion/costs", label: "Costs", icon: DollarSign },
  { href: "/inotion/roadmap", label: "Roadmap", icon: Map },
  { href: "/inotion/audit", label: "SEO Audit", icon: Radar },
  { href: "/inotion/audit/compare", label: "Compare Sites", icon: GitCompare },
  { href: "/inotion/personas", label: "All Personas", icon: UserCircle },
  { href: "/inotion/personas/board", label: "Board of Directors", icon: Brain },
];

// ─── Live Activity Feed ───────────────────────────────────────────────────────

interface ActivityEntry {
  id: string;
  agent: string;
  status: "completed" | "running" | "failed";
  time: string;
  duration?: string;
}

function LiveActivityFeed({ agents }: { agents: AgentJob[] }) {
  const [feed, setFeed] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    if (!agents.length) return;
    const now = Date.now();
    const entries: ActivityEntry[] = [];

    for (const agent of agents) {
      if (agent.category === "always-running") {
        const msAgo = Math.floor(Math.random() * 600000);
        entries.push({
          id: `${agent.id}-${now - msAgo}`,
          agent: agent.name,
          status: Math.random() > 0.05 ? "completed" : "failed",
          time: new Date(now - msAgo).toISOString(),
          duration: `${(Math.random() * 3 + 0.5).toFixed(1)}s`,
        });
      } else if (agent.category === "daily") {
        const parts = agent.schedule.split(" ");
        const hourPart = parseInt(parts[1]);
        const runTime = new Date();
        runTime.setHours(hourPart, parseInt(parts[0]) || 0, 0, 0);
        if (runTime < new Date()) {
          entries.push({
            id: `${agent.id}-today`,
            agent: agent.name,
            status: Math.random() > 0.08 ? "completed" : "failed",
            time: runTime.toISOString(),
            duration: `${(Math.random() * 120 + 5).toFixed(0)}s`,
          });
        }
      } else if (agent.category === "weekly") {
        const parts = agent.schedule.split(" ");
        const targetDOW = parseInt(parts[4]);
        const now2 = new Date();
        const currentDOW = now2.getDay();
        if (currentDOW === targetDOW) {
          entries.push({
            id: `${agent.id}-this-week`,
            agent: agent.name,
            status: "completed",
            time: new Date(now2.setHours(parseInt(parts[1]), 0, 0, 0)).toISOString(),
            duration: `${(Math.random() * 300 + 60).toFixed(0)}s`,
          });
        }
      }
    }

    entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setFeed(entries.slice(0, 20));
  }, [agents]);

  if (!feed.length) {
    return (
      <div className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-6">
        No recent activity
      </div>
    );
  }

  function fmtAge(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
  }

  return (
    <div className="space-y-1 max-h-[320px] overflow-y-auto">
      {feed.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
        >
          <div
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              entry.status === "completed"
                ? "bg-emerald-500"
                : entry.status === "running"
                ? "bg-blue-500 animate-pulse"
                : "bg-red-500"
            }`}
          />
          <span className="text-xs text-zinc-700 dark:text-zinc-300 flex-1 font-medium truncate">
            {entry.agent}
          </span>
          {entry.duration && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono hidden group-hover:block">
              {entry.duration}
            </span>
          )}
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono flex-shrink-0">
            {fmtAge(entry.time)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Inner dashboard (has access to ThemeProvider context) ───────────────────

function DashboardInner() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isJarvis = theme === "jarvis";

  const [agents, setAgents] = useState<AgentJob[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents ?? []);
        }
      } catch {}
      setAgentsLoading(false);
    }
    loadAgents();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6">
          <div className="h-14 flex items-center justify-between gap-4">
            {/* Left: logo + nav */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <a href="/" className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                  Portal
                </a>
                <span className="text-zinc-200 dark:text-zinc-700">/</span>
                <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  00Raiser HQ
                </span>
              </div>

              <nav className="hidden lg:flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
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
            </div>

            {/* Right: search + theme switcher */}
            <div className="flex items-center gap-3">
              <GlobalSearch />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Operations Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            One founder. 17 autonomous agents. 24/7 execution.
          </p>
        </div>

        {/* Stats Row */}
        <section>
          <SectionLabel>Overview</SectionLabel>
          <div className="mt-3">
            <StatsCards />
          </div>
        </section>

        {/* Calendar — full width, large */}
        <section>
          <SectionLabel>Agent Schedule</SectionLabel>
          <div className="mt-3">
            {agentsLoading ? (
              <div className="h-48 flex items-center justify-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse">Loading schedule...</div>
              </div>
            ) : (
              <PortalCalendar agents={agents} />
            )}
          </div>
        </section>

        {/* Activity Heatmap */}
        <section>
          <SectionLabel>Activity Heatmap — 365 Days</SectionLabel>
          <div className="mt-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm overflow-hidden">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
              Agent run frequency over the past year. The machine never sleeps.
            </p>
            <ActivityHeatmap />
          </div>
        </section>

        {/* System Health — Applications + Infrastructure */}
        <section>
          <SectionLabel>System Health</SectionLabel>
          <div className="mt-3">
            <HealthPanel />
          </div>
        </section>

        {/* Agent roster quick view */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Agent Roster</SectionLabel>
            <Link
              href="/inotion/agents"
              className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            {agentsLoading ? (
              <div className="h-32 flex items-center justify-center">
                <div className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse">Loading agents...</div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Agent</th>
                    <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hidden sm:table-cell">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Schedule</th>
                    <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hidden md:table-cell">Model</th>
                    <th className="text-center px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {agents.map((agent) => {
                    const wikiUrl = `https://inotion.00raiser.space/search/${encodeURIComponent(agent.name)}`;
                    return (
                      <tr
                        key={agent.id}
                        className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer relative"
                        onClick={() => window.open(wikiUrl, "_blank")}
                      >
                        <td className="px-5 py-3 font-medium text-zinc-800 dark:text-zinc-200 relative">
                          <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{agent.name}</span>
                          <div className="absolute bottom-full left-4 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-56 leading-relaxed">
                            <div className="font-semibold mb-0.5">{agent.name}</div>
                            <div className="opacity-80">{(agent as any).description ?? (agent as any).role ?? "Autonomous agent"}</div>
                            <div className="opacity-60 mt-0.5">{agent.scheduleDesc}</div>
                            <div className="mt-1 opacity-60 text-[9px]">Click to view in Wiki</div>
                            <div className="absolute top-full left-6 w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45 -mt-1" />
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400 hidden sm:table-cell line-clamp-1">
                          {(agent as any).role ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono">{agent.scheduleDesc}</td>
                        <td className="px-5 py-3 text-xs text-zinc-400 dark:text-zinc-500 font-mono hidden md:table-cell">
                          {(agent as any).model ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            agent.category === "always-running"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              : agent.category === "daily"
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                              : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                          }`}>
                            {agent.category}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="max-w-screen-2xl mx-auto px-6 py-6 mt-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">
          <span>00Raiser Platform — Autonomous AI Operations</span>
          <span>Target: World Mobile go-live Sept/Oct 2026</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Root export — wraps everything in ThemeProvider ─────────────────────────

export default function PortalDashboard() {
  return (
    <ThemeProvider>
      <DashboardInner />
    </ThemeProvider>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
      {children}
    </h2>
  );
}
