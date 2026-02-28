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
            <Link href="/inotion" className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} />
              Dashboard
            </Link>
            <span className="text-zinc-200 dark:text-zinc-700">/</span>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Roadmap</h1>
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
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Roadmap</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
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
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl px-5 py-4 flex items-center gap-3">
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
              <div key={i} className="h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : phases ? (
          <div className="space-y-6">
            {phases.map((phase, i) => {
              const pct = phase.progress ?? 0;
              const done = phase.taskCounts?.done ?? 0;
              const total = phase.taskCounts?.total ?? phase.tasks.length;

              return (
                <div key={phase.id ?? i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none hover:border-amber-500/30 transition-all duration-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{phase.title}</h3>
                        {phase.description && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{phase.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {phase.targetDate && (
                          <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">
                            <Clock size={9} />
                            {phase.targetDate}
                          </div>
                        )}
                        <span className="text-xs font-bold tabular-nums text-zinc-600 dark:text-zinc-400 font-mono">{done}/{total}</span>
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
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
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
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
            <div className="mb-3">
              <Circle size={24} className="text-zinc-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Roadmap unavailable</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 max-w-sm">
              Could not load roadmap data. Check that the roadmap API is running and try refreshing the page.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
