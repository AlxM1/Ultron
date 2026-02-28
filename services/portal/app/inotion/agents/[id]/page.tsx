"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity, Clock, Cpu, AlertTriangle } from "lucide-react";
import ThemeToggle from "../../../components/inotion/ThemeToggle";
import { CATEGORY_COLORS } from "../../_lib/constants";

interface Agent {
  id: string;
  name: string;
  role?: string;
  description?: string;
  schedule: string;
  scheduleDesc: string;
  category: string;
  model?: string;
  activeSince?: string;
  lastRun?: string;
  nextRun?: string;
  status?: string;
  errorCount7d?: number;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (ms < 0) {
    const fm = Math.floor(-ms / 60000);
    if (fm < 60) return `in ${fm}m`;
    const fh = Math.floor(fm / 60);
    return fh < 24 ? `in ${fh}h` : `in ${Math.floor(fh / 24)}d`;
  }
  const m = Math.floor(ms / 60000);
  if (m < 1) return "< 1m ago";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AgentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          const found = (data.agents ?? []).find((a: Agent) => a.id === id);
          setAgent(found ?? null);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-sm text-zinc-400 animate-pulse">Loading agent...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-zinc-500">Agent not found: {id}</p>
        <Link href="/inotion/agents" className="text-xs text-blue-500 hover:underline">Back to agents</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/inotion/agents" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">
              <ArrowLeft size={12} /> Agents
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-sm font-semibold">{agent.name}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
            agent.category === "always-running" ? "bg-blue-500" :
            agent.category === "daily" ? "bg-emerald-500" : "bg-purple-500"
          }`} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
            {agent.role && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{agent.role}</p>}
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_COLORS[agent.category] ?? ""}`}>
                {agent.category}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">since {agent.activeSince ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBox icon={Clock} label="Schedule" value={agent.scheduleDesc} sub={agent.schedule} />
          <StatBox icon={Cpu} label="Model" value={agent.model ?? "script"} />
          <StatBox icon={Activity} label="Last Run" value={fmtDate(agent.lastRun)} />
          <StatBox icon={Activity} label="Next Run" value={fmtDate(agent.nextRun)} />
        </div>

        {/* Description */}
        {agent.description && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">Description</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{agent.description}</p>
          </div>
        )}

        {/* Error count */}
        {(agent.errorCount7d ?? 0) > 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-5 flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-400">{agent.errorCount7d} errors in the last 7 days</span>
          </div>
        )}
      </main>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{label}</span>
        <Icon size={12} className="text-zinc-400" />
      </div>
      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{value}</div>
      {sub && <div className="text-[10px] font-mono text-zinc-400 mt-0.5">{sub}</div>}
    </div>
  );
}
