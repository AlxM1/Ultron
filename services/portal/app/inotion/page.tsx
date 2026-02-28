"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatsCards from "../components/inotion/StatsCards";
import PortalCalendar from "../components/inotion/PortalCalendar";
import HealthPanel from "../components/inotion/HealthPanel";
import ActivityHeatmap from "../components/inotion/ActivityHeatmap";
import { Loader2 } from "lucide-react";
import type { AgentJob } from "../components/inotion/PortalCalendar";

/* ─── Live Activity Feed ─────────────────────────────────────────────────── */

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
      <div className="flex flex-col items-center justify-center py-10 text-zinc-400 dark:text-zinc-600">
        <svg className="w-8 h-8 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span className="text-sm">No recent activity</span>
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
            <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono hidden group-hover:block">
              {entry.duration}
            </span>
          )}
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono flex-shrink-0">
            {fmtAge(entry.time)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────────────────── */

export default function PortalDashboard() {
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
    <div className="space-y-6 sm:space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Operations Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
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

      {/* Calendar */}
      <section>
        <SectionLabel>Agent Schedule</SectionLabel>
        <div className="mt-3">
          {agentsLoading ? (
            <div className="h-48 flex items-center justify-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
              <Loader2 size={20} className="animate-spin text-zinc-400 dark:text-zinc-600" />
            </div>
          ) : (
            <PortalCalendar agents={agents} />
          )}
        </div>
      </section>

      {/* Activity Heatmap */}
      <section>
        <SectionLabel>Activity Heatmap — 365 Days</SectionLabel>
        <div className="mt-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm dark:shadow-none overflow-x-auto">
          <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-4">
            Agent run frequency over the past year. The machine never sleeps.
          </p>
          <ActivityHeatmap />
        </div>
      </section>

      {/* System Health */}
      <section>
        <SectionLabel>System Health</SectionLabel>
        <div className="mt-3">
          <HealthPanel />
        </div>
      </section>

      {/* Agent roster */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Agent Roster</SectionLabel>
          <Link
            href="/inotion/agents"
            className="text-xs text-zinc-400 dark:text-zinc-600 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none overflow-x-auto">
          {agentsLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-zinc-400 dark:text-zinc-600" />
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zinc-400 dark:text-zinc-600">
              <svg className="w-8 h-8 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="text-sm">No agents found</span>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Agent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 hidden sm:table-cell">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Schedule</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 hidden md:table-cell">Model</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {agents.map((agent) => {
                  const wikiUrl = `https://inotion.00raiser.space/search/${encodeURIComponent(agent.name)}`;
                  return (
                    <tr
                      key={agent.id}
                      className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      onClick={() => window.open(wikiUrl, "_blank")}
                    >
                      <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                        <span className="group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{agent.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-600 dark:text-zinc-400 hidden sm:table-cell">
                        {(agent as any).role ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-600 dark:text-zinc-400 font-mono">{agent.scheduleDesc}</td>
                      <td className="px-5 py-3.5 text-xs text-zinc-400 dark:text-zinc-600 font-mono hidden md:table-cell">
                        {(agent as any).model ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          agent.category === "always-running"
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800"
                            : agent.category === "daily"
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800"
                            : "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 ring-1 ring-purple-200 dark:ring-purple-800"
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
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </h2>
  );
}
