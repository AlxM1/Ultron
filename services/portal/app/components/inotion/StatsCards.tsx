"use client";

import { useEffect, useState } from "react";
import { Users, FileText, Cpu, Database, DollarSign, Activity } from "lucide-react";

interface Stats {
  totalCreators: number;
  totalTranscripts: number;
  activeAgents: number;
  totalContent: number;
  todayCost: number;
  healthyServices: number;
  totalServices: number;
}

interface StatCard {
  label: string;
  key: keyof Stats;
  icon: React.ElementType;
  format: (v: number, stats: Stats) => string;
  sub?: (stats: Stats) => string;
  color: string;
}

const CARDS: StatCard[] = [
  {
    label: "Creators Tracked",
    key: "totalCreators",
    icon: Users,
    format: (v) => v.toLocaleString(),
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "Transcripts",
    key: "totalTranscripts",
    icon: FileText,
    format: (v) => v.toLocaleString(),
    color: "text-violet-600 dark:text-violet-400",
  },
  {
    label: "Active Agents",
    key: "activeAgents",
    icon: Cpu,
    format: (v) => v.toString(),
    sub: () => "autonomous • 24/7",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Content Items",
    key: "totalContent",
    icon: Database,
    format: (v) => v.toLocaleString(),
    color: "text-amber-600 dark:text-amber-400",
  },
  {
    label: "Today's Cost",
    key: "todayCost",
    icon: DollarSign,
    format: (v) => `$${v.toFixed(2)}`,
    sub: () => "API spend",
    color: "text-rose-600 dark:text-rose-400",
  },
  {
    label: "System Health",
    key: "healthyServices",
    icon: Activity,
    format: (v, stats) => `${v}/${stats.totalServices}`,
    sub: (stats) => stats.healthyServices === stats.totalServices ? "All systems go" : "Degraded",
    color: "text-teal-600 dark:text-teal-400",
  },
];

export default function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {}
      setLoading(false);
    }
    load();
    const iv = setInterval(load, 120000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = stats ? stats[card.key] : null;
        const display = loading || value === null ? "—" : card.format(Number(value), stats!);
        const sub = stats && card.sub ? card.sub(stats!) : null;

        return (
          <div
            key={card.key}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {card.label}
              </p>
              <Icon size={14} className={`${card.color} flex-shrink-0`} />
            </div>
            <div className={`text-2xl font-bold tracking-tight ${loading ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-900 dark:text-zinc-50"}`}>
              {loading ? (
                <div className="h-7 w-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
              ) : (
                display
              )}
            </div>
            {sub && !loading && (
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">{sub}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
