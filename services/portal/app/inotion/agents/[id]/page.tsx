"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity, Clock, Cpu, AlertTriangle } from "lucide-react";
import ThemeToggle from "../../../components/inotion/ThemeToggle";

interface Agent {
  id: string;
  name: string;
  role?: string;
  schedule: string;
  scheduleDesc: string;
  category: string;
  model?: string;
  description?: string;
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

const CATEGORY_STYLES: Record<string, string> = {
  "always-running": "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  daily: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  weekly: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
};

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok) {
          const data = await res.json();
          const found = (data.agents ?? []).find((a: Agent) => a.id === agentId);
          setAgent(found ?? null);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [agentId]);

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
        <AlertTriangle size={24} className="text-zinc-400" />
        <p className="text-sm text-zinc-500">Agent &quot;{agentId}&quot; not found</p>
        <Link href="/inotion/agents" className="text-xs text-blue-500 hover:underline">Back to agents</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/inotion/agents" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} /> Agents
            </Link>
            <span className="text-zinc-200 dark:text-zinc-700">/</span>
            <span className="text-sm font-semibold">{agent.name}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        {/* Hero */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  agent.category === "always-running" ? "bg-blue-500" :
                  agent.category === "daily" ? "bg-emerald-500" : "bg-purple-500"
                }`} />
                <h1 className="text-xl font-bold">{agent.name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_STYLES[agent.category] ?? ""}`}>
                  {agent.category}
                </span>
              </div>
              {agent.role && <p className="text-sm text-zinc-500 dark:text-zinc-400">{agent.role}</p>}
            </div>
            <Activity size={20} className="text-zinc-300 dark:text-zinc-600" />
          </div>

          {agent.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-4">
              {agent.description}
            </p>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InfoCard icon={<Clock size={14} />} label="Schedule" value={agent.scheduleDesc} sub={agent.schedule} />
          <InfoCard icon={<Cpu size={14} />} label="Model" value={agent.model ?? "script"} />
          <InfoCard label="Last Run" value={fmtDate(agent.lastRun)} />
          <InfoCard label="Next Run" value={fmtDate(agent.nextRun)} />
          <InfoCard label="Active Since" value={agent.activeSince ?? "—"} />
          <InfoCard label="Status" value={agent.status ?? "active"} />
          <InfoCard label="Errors (7d)" value={String(agent.errorCount7d ?? 0)} />
        </div>
      </main>
    </div>
  );
}

function InfoCard({ icon, label, value, sub }: { icon?: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span className="text-zinc-400">{icon}</span>}
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{label}</p>
      </div>
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{value}</p>
      {sub && <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}
