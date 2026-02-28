"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Activity } from "lucide-react";
import ThemeToggle from "../../components/inotion/ThemeToggle";
import GlobalSearch from "../../components/inotion/GlobalSearch";
import PortalCalendar from "../../components/inotion/PortalCalendar";
import type { AgentJob } from "../../components/inotion/PortalCalendar";
import { CATEGORY_COLORS } from "../_lib/constants";

interface AgentDetail extends AgentJob {
  role?: string;
  model?: string;
  description?: string;
  activeSince?: string;
  lastRun?: string;
  nextRun?: string;
  status?: "active" | "failed" | "pending";
  errorCount7d?: number;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (ms < 0) {
    // Future
    const fms = -ms;
    const fm = Math.floor(fms / 60000);
    if (fm < 60) return `in ${fm}m`;
    const fh = Math.floor(fm / 60);
    if (fh < 24) return `in ${fh}h`;
    return `in ${Math.floor(fh / 24)}d`;
  }
  const m = Math.floor(ms / 60000);
  if (m < 1) return "< 1m ago";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentDetail | null>(null);
  const [view, setView] = useState<"table" | "calendar">("calendar");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "always-running" | "daily" | "weekly">("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents ?? []);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const filteredAgents = categoryFilter === "all"
    ? agents
    : agents.filter((a) => a.category === categoryFilter);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/inotion" className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} />
              Dashboard
            </Link>
            <span className="text-zinc-200 dark:text-zinc-700">/</span>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Agent Schedule</h1>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Agent Schedule</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {loading ? "Loading..." : `${agents.length} autonomous agents running 24/7`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Category filter */}
            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {(["all", "always-running", "daily", "weekly"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-xs px-3 py-1.5 border-r last:border-r-0 border-zinc-200 dark:border-zinc-800 transition-colors duration-200 capitalize ${
                    categoryFilter === cat
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <button
                onClick={() => setView("calendar")}
                className={`text-xs px-3 py-1.5 transition-colors duration-200 ${
                  view === "calendar"
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setView("table")}
                className={`text-xs px-3 py-1.5 border-l border-zinc-200 dark:border-zinc-800 transition-colors duration-200 ${
                  view === "table"
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-sm text-zinc-400 dark:text-zinc-600 animate-pulse">Loading agents...</div>
          </div>
        ) : view === "calendar" ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm dark:shadow-none">
            <PortalCalendar
              agents={filteredAgents}
              onJobClick={(job) => setSelectedAgent(job as AgentDetail)}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Agent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 hidden md:table-cell">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Schedule</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 hidden sm:table-cell">Last Run</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 hidden sm:table-cell">Next Run</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 hidden lg:table-cell">Model</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Category</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Errors (7d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredAgents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors duration-200 cursor-pointer"
                    onClick={() => setSelectedAgent(agent === selectedAgent ? null : agent)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          agent.category === "always-running" ? "bg-blue-500" :
                          agent.category === "daily" ? "bg-emerald-500" : "bg-purple-500"
                        }`} />
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-600 dark:text-zinc-400 hidden md:table-cell max-w-xs">
                      <span className="line-clamp-1">{agent.role ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-zinc-600 dark:text-zinc-400">{agent.scheduleDesc}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-zinc-400 dark:text-zinc-600 hidden sm:table-cell">{fmtDate(agent.lastRun)}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-zinc-400 dark:text-zinc-600 hidden sm:table-cell">{fmtDate(agent.nextRun)}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-zinc-400 dark:text-zinc-600 hidden lg:table-cell">{agent.model ?? "—"}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium border ${CATEGORY_COLORS[agent.category]}`}>
                        {agent.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-xs font-mono ${
                        (agent.errorCount7d ?? 0) > 0 ? "text-red-500 dark:text-red-400 font-medium" : "text-zinc-300 dark:text-zinc-700"
                      }`}>
                        {agent.errorCount7d ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Agent detail panel */}
        {selectedAgent && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm dark:shadow-none hover:border-amber-500/30 transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${
                    selectedAgent.category === "always-running" ? "bg-blue-500" :
                    selectedAgent.category === "daily" ? "bg-emerald-500" : "bg-purple-500"
                  }`} />
                  <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{selectedAgent.name}</h2>
                  <Activity size={14} className="text-zinc-400 dark:text-zinc-600" />
                </div>
                {selectedAgent.role && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{selectedAgent.role}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-xs text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors duration-200"
              >
                Dismiss
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Schedule</div>
                <div className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{selectedAgent.scheduleDesc}</div>
                <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 mt-0.5">{selectedAgent.schedule}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Model</div>
                <div className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{selectedAgent.model ?? "script"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Last Run</div>
                <div className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{fmtDate(selectedAgent.lastRun)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Next Run</div>
                <div className="text-sm font-mono text-zinc-900 dark:text-zinc-100">{fmtDate(selectedAgent.nextRun)}</div>
              </div>
            </div>

            {selectedAgent.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                {selectedAgent.description}
              </p>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
