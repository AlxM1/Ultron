"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Circle, Clock, Zap, Target } from "lucide-react";
import ThemeToggle from "../../components/inotion/ThemeToggle";
import GlobalSearch from "../../components/inotion/GlobalSearch";

interface Task {
  id?: string;
  title: string;
  description?: string;
  status: "done" | "in-progress" | "not-started";
  priority?: string;
}

interface Phase {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  targetDate?: string;
  progress?: number;
  tasks: Task[];
  taskCounts?: { total: number; done: number; inProgress: number; notStarted: number };
}

// Fallback: hardcoded milestone timeline
const FALLBACK_MILESTONES = [
  { title: "Platform Architecture", desc: "Docker stack: Cortex, AgentSmith, Portal, PostgreSQL", date: "Oct 2024", status: "done", category: "Infra" },
  { title: "JARVIS Portal v1", desc: "Voice assistant, service launcher, JARVIS HUD interface", date: "Oct 2024", status: "done", category: "Portal" },
  { title: "Content Intel Pipeline", desc: "Apify + YouTube Downloader + WhisperFlow transcription", date: "Nov 2024", status: "done", category: "Data" },
  { title: "17 Autonomous Agents", desc: "Full cron agent roster operational 24/7", date: "Dec 2024", status: "done", category: "AI" },
  { title: "INotion Knowledge Base", desc: "Outline integration with full portal dashboard", date: "Dec 2024", status: "done", category: "Knowledge" },
  { title: "SSO Authentication", desc: "Authentik OIDC across all services", date: "Jan 2025", status: "done", category: "Security" },
  { title: "00Raiser Portal Dashboard", desc: "Investor-quality portal with calendar, health panel, creator intelligence", date: "Feb 2025", status: "in-progress", category: "Portal" },
  { title: "Creator Intelligence v2", desc: "Enhanced scoring, topic clustering, strategic value ratings", date: "Mar 2025", status: "upcoming", category: "AI" },
  { title: "Cost Optimization Engine", desc: "Auto model routing: Sonnet for simple tasks, Opus for complex", date: "Apr 2025", status: "upcoming", category: "AI" },
  { title: "World Mobile Technical Integration", desc: "Integration work begins with World Mobile team", date: "Jun 2025", status: "upcoming", category: "Business" },
  { title: "Beta Platform Launch", desc: "Invite-only beta with first creator cohort", date: "Jul 2025", status: "upcoming", category: "Business" },
  { title: "Revenue v1", desc: "First subscription tier live, payment processing", date: "Aug 2025", status: "upcoming", category: "Business" },
  { title: "World Mobile Go-Live", desc: "Full production launch on World Mobile network", date: "Sep/Oct 2026", status: "upcoming", category: "Business", anchor: true },
];

const CATEGORY_COLORS: Record<string, string> = {
  Infra: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
  Portal: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  Data: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  Knowledge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
  AI: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  Security: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  Business: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
  Other: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
};

export default function RoadmapPage() {
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/roadmap");
        if (res.ok) {
          const data = await res.json();
          if (!data.error && Array.isArray(data.phases) && data.phases.length > 0) {
            setPhases(data.phases);
            setLastUpdated(data.lastUpdated ?? data.fileUpdatedAt ?? null);
          }
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/inotion" className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} />
              Dashboard
            </Link>
            <span className="text-zinc-200 dark:text-zinc-700">/</span>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Roadmap</h1>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Roadmap</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Anchor event: World Mobile go-live Sept/Oct 2026
              {lastUpdated && (
                <span className="ml-2 text-xs font-mono text-zinc-400 dark:text-zinc-600">
                  Updated {new Date(lastUpdated).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Anchor callout */}
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl px-5 py-4 flex items-center gap-3">
          <Target size={16} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">World Mobile Go-Live — Sept/Oct 2026</p>
            <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-0.5">
              All platform milestones are sequenced to enable full production launch on the World Mobile network.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : phases ? (
          // Phases view from roadmap.json
          <div className="space-y-6">
            {phases.map((phase, i) => {
              const pct = phase.progress ?? 0;
              const done = phase.taskCounts?.done ?? 0;
              const total = phase.taskCounts?.total ?? phase.tasks.length;

              return (
                <div key={phase.id ?? i} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{phase.title}</h3>
                        {phase.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{phase.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {phase.targetDate && (
                          <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                            <Clock size={9} />
                            {phase.targetDate}
                          </div>
                        )}
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 font-mono">{done}/{total}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full transition-all bg-gradient-to-r from-emerald-500 to-blue-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Tasks */}
                    {phase.tasks.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {phase.tasks.map((task, j) => (
                          <div
                            key={task.id ?? j}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                              task.status === "done"
                                ? "text-zinc-400 dark:text-zinc-600"
                                : task.status === "in-progress"
                                ? "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30"
                                : "text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            {task.status === "done" ? (
                              <CheckCircle size={11} className="text-emerald-500 flex-shrink-0" />
                            ) : task.status === "in-progress" ? (
                              <Zap size={11} className="text-blue-500 flex-shrink-0" />
                            ) : (
                              <Circle size={11} className="text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
                            )}
                            <span className={task.status === "done" ? "line-through" : ""}>{task.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Fallback: simple timeline
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-3">
              {FALLBACK_MILESTONES.map((m, i) => {
                const isAnchor = (m as any).anchor;
                const catColor = CATEGORY_COLORS[m.category] ?? CATEGORY_COLORS.Other;

                return (
                  <div key={i} className="relative flex gap-4 pl-12">
                    <div className={`absolute left-2.5 top-4 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center bg-white dark:bg-zinc-950 ${
                      m.status === "done" ? "text-emerald-500" :
                      m.status === "in-progress" ? "text-blue-500" :
                      "text-zinc-300 dark:text-zinc-600"
                    }`}>
                      {m.status === "done" ? <CheckCircle size={14} /> : m.status === "in-progress" ? <Zap size={14} /> : <Circle size={11} />}
                    </div>
                    <div className={`flex-1 bg-white dark:bg-zinc-900 rounded-xl border p-4 shadow-sm ${
                      isAnchor ? "border-rose-300 dark:border-rose-800" :
                      m.status === "in-progress" ? "border-blue-200 dark:border-blue-800/50" :
                      "border-zinc-200 dark:border-zinc-800"
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-sm font-semibold ${m.status === "done" ? "text-zinc-400 dark:text-zinc-500 line-through" : "text-zinc-800 dark:text-zinc-200"}`}>
                              {m.title}
                            </span>
                            {isAnchor && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wide">Anchor</span>}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{m.desc}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${catColor}`}>{m.category}</span>
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{m.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
