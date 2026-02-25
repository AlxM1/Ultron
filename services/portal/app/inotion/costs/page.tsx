"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, DollarSign, TrendingUp, Cpu, BarChart2 } from "lucide-react";
import ThemeToggle from "../../components/inotion/ThemeToggle";
import GlobalSearch from "../../components/inotion/GlobalSearch";
import dynamic from "next/dynamic";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });

interface DailyTrend {
  date: string;
  tokens: number;
  cost: number;
  cumulative: number;
}

interface ModelBreakdown {
  model: string;
  cost: number;
  tokens: number;
  pct: number;
}

interface AgentBreakdown {
  agent: string;
  cost: number;
  tokens: number;
  pct: number;
}

interface CostData {
  updatedAt?: string;
  totalCost: number;
  totalTokens: number;
  dailyTrend: DailyTrend[];
  modelBreakdown: ModelBreakdown[];
  agentBreakdown: AgentBreakdown[];
}

function formatCurrency(n: number): string {
  if (!n || n === 0) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (!n) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

const MODEL_COLORS: Record<string, string> = {
  "claude-opus-4-6": "#8b5cf6",
  "claude-sonnet-4-6": "#3b82f6",
  "claude-haiku": "#06b6d4",
  "gpt-4": "#10b981",
  "whisper": "#f59e0b",
};

function getModelColor(model: string, index: number): string {
  const fallbacks = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (model.toLowerCase().includes(key)) return color;
  }
  return fallbacks[index % fallbacks.length];
}

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<"daily" | "cumulative">("daily");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/costs");
        if (res.ok) {
          const json = await res.json();
          if (json.error) {
            setError(json.error);
          } else {
            setData(json);
          }
        }
      } catch (e) {
        setError("Failed to load cost data");
      }
      setLoading(false);
    }
    load();
  }, []);

  const today = data?.dailyTrend?.at(-1);
  const yesterday = data?.dailyTrend?.at(-2);
  const avgDaily = data?.dailyTrend && data.dailyTrend.length > 0
    ? data.dailyTrend.reduce((s, d) => s + d.cost, 0) / data.dailyTrend.length
    : 0;

  const chartData = data?.dailyTrend?.slice(-30).map((d) => ({
    date: d.date.slice(5), // MM-DD
    cost: d.cost,
    cumulative: d.cumulative,
  })) ?? [];

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
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Cost Tracker</h1>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Cost Tracker</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              API spend across all models and agents
              {data?.updatedAt && (
                <span className="ml-2 font-mono text-xs text-zinc-400 dark:text-zinc-600">
                  Updated {new Date(data.updatedAt).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-5 py-3 text-sm text-amber-700 dark:text-amber-400">
            {error} — Check that cost-ledger.xlsx is mounted at /data/costs/
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Spend", value: formatCurrency(data?.totalCost ?? 0), icon: DollarSign, color: "text-violet-600 dark:text-violet-400" },
            { label: "Today", value: today ? formatCurrency(today.cost) : "—", icon: TrendingUp, color: "text-blue-600 dark:text-blue-400" },
            { label: "Avg Daily", value: formatCurrency(avgDaily), icon: BarChart2, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Total Tokens", value: data ? formatTokens(data.totalTokens) : "—", icon: Cpu, color: "text-amber-600 dark:text-amber-400" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{card.label}</p>
                  <Icon size={12} className={card.color} />
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {loading ? <div className="h-7 w-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" /> : card.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Daily trend chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Spend Trend (Last 30 Days)
            </h2>
            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <button
                onClick={() => setChartMode("daily")}
                className={`text-xs px-3 py-1 transition-colors ${chartMode === "daily" ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
              >
                Daily
              </button>
              <button
                onClick={() => setChartMode("cumulative")}
                className={`text-xs px-3 py-1 border-l border-zinc-200 dark:border-zinc-700 transition-colors ${chartMode === "cumulative" ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
              >
                Cumulative
              </button>
            </div>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <div className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse">Loading chart...</div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center">
              <DollarSign size={24} className="text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No cost data available</p>
              <p className="text-xs text-zinc-300 dark:text-zinc-700 mt-1">Mount cost-ledger.xlsx at /data/costs/</p>
            </div>
          ) : chartMode === "daily" ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(4)}`, "Cost"]} />
                  <Bar dataKey="cost" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Cumulative"]} />
                  <Line type="monotone" dataKey="cumulative" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Two column: Model + Agent breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model breakdown */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">By Model</h2>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}</div>
            ) : !data?.modelBreakdown?.length ? (
              <div className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">No model data</div>
            ) : (
              <div className="space-y-3">
                {data.modelBreakdown.map((m, i) => (
                  <div key={m.model}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate flex-1 mr-4">{m.model}</span>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{formatCurrency(m.cost)}</span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-1.5">{m.pct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${m.pct}%`, backgroundColor: getModelColor(m.model, i) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent breakdown */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">By Agent</h2>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}</div>
            ) : !data?.agentBreakdown?.length ? (
              <div className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">No agent data</div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {data.agentBreakdown.map((a) => (
                  <div key={a.agent}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate flex-1 mr-4">{a.agent}</span>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{formatCurrency(a.cost)}</span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-1.5">{a.pct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${a.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
