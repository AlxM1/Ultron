"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DollarSign, Map, BookOpen,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentRow {
  name:      string;
  model:     string;
  tokensIn:  number;
  tokensOut: number;
  cacheRead: number;
  costUSD:   number;
  costCAD:   number;
  runs:      number;
  lastRun:   string;
  category:  string;
}

interface DailyEntry {
  date:    string;
  costUSD: number;
  costCAD: number;
  runs:    number;
}

interface CategoryEntry {
  category: string;
  costUSD:  number;
  costCAD:  number;
  pct:      number;
}

interface CostData {
  period:        string;
  cadRate:       number;
  resetTime:     string;
  totalTokensIn: number;
  totalTokensOut:number;
  totalCostUSD:  number;
  totalCostCAD:  number;
  weeklyUSD:     number;
  weeklyCAD:     number;
  budgetUSD:     number;
  budgetUsedPct: number;
  agents:        AgentRow[];
  daily:         DailyEntry[];
  categories:    CategoryEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtCAD(n: number): string {
  return `CA$${n.toFixed(2)}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortDate(iso: string): string {
  // "2026-02-19" → "Feb 19"
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });
}

function modelLabel(model: string): string {
  if (model.includes("opus"))   return "opus-4-6";
  if (model.includes("sonnet")) return "sonnet-4-6";
  if (model.includes("haiku"))  return "haiku-4-6";
  return model;
}

function modelBadgeClass(model: string): string {
  if (model.includes("opus"))
    return "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700";
  if (model.includes("sonnet"))
    return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700";
  return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700";
}

function costColor(usd: number): string {
  if (usd < 0.50) return "text-emerald-600 dark:text-emerald-400";
  if (usd < 2.00) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

const CATEGORY_COLORS: Record<string, string> = {
  "Interactive":       "#8b5cf6",
  "Cron Jobs":         "#3b82f6",
  "Content Pipeline":  "#10b981",
  "AI/Analysis":       "#f59e0b",
  "Monitoring":        "#6366f1",
  "Maintenance":       "#64748b",
};

// ─── Token Reset Countdown ────────────────────────────────────────────────────

function TokenResetCountdown({ resetTime }: { resetTime: string }) {
  const [countdown, setCountdown] = useState<{ h: number; m: number; s: number; urgent: boolean; close: boolean }>({
    h: 0, m: 0, s: 0, urgent: false, close: false,
  });

  const computeNext = useCallback(() => {
    const now = new Date();
    // Next Thursday 07:00 PST = UTC-8 → 15:00 UTC
    const target = new Date(now);
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 4=Thu
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
    target.setUTCDate(target.getUTCDate() + daysUntilThursday);
    target.setUTCHours(15, 0, 0, 0);
    if (target <= now) {
      target.setUTCDate(target.getUTCDate() + 7);
    }
    const ms = target.getTime() - now.getTime();
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return { h, m, s, urgent: h < 2, close: m < 30 && h === 0 };
  }, []);

  useEffect(() => {
    setCountdown(computeNext());
    const id = setInterval(() => setCountdown(computeNext()), 1000);
    return () => clearInterval(id);
  }, [computeNext]);

  const { h, m, s, urgent, close } = countdown;
  const pad = (n: number) => String(n).padStart(2, "0");

  let bannerClass = "bg-zinc-900/5 dark:bg-zinc-100/5 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400";
  if (close)   bannerClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300";
  else if (urgent) bannerClass = "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300";

  const label = close
    ? "Almost there — token reset imminent"
    : `Next token reset in ${h}h ${pad(m)}m ${pad(s)}s — ${resetTime}`;

  return (
    <div className={`rounded-xl border px-5 py-3 text-xs font-mono flex items-center justify-between ${bannerClass}`}>
      <span>{label}</span>
      <span className="opacity-60 text-[10px] uppercase tracking-widest">Weekly Reset</span>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ data }: { data: CostData }) {
  const budgetRemaining = 100 - data.budgetUsedPct;
  const barColor =
    budgetRemaining > 50 ? "bg-emerald-500" :
    budgetRemaining > 20 ? "bg-amber-500"   :
    "bg-red-500";

  const cards = [
    {
      label:   "TODAY'S SPEND",
      primary: fmtUSD(data.totalCostUSD),
      sub:     fmtCAD(data.totalCostCAD),
      icon:    DollarSign,
      accent:  "text-blue-600 dark:text-blue-400",
    },
    {
      label:   "WEEKLY SPEND",
      primary: fmtUSD(data.weeklyUSD),
      sub:     fmtCAD(data.weeklyCAD),
      icon:    Map,
      accent:  "text-violet-600 dark:text-violet-400",
    },
    {
      label:   "TOKENS TODAY",
      primary: fmtTokens(data.totalTokensIn + data.totalTokensOut),
      sub:     `${fmtTokens(data.totalTokensIn)} in / ${fmtTokens(data.totalTokensOut)} out`,
      icon:    BookOpen,
      accent:  "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {c.label}
              </p>
              <Icon size={12} className={c.accent} />
            </div>
            <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{c.primary}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{c.sub}</p>
          </div>
        );
      })}

      {/* Budget card with progress bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            BUDGET REMAINING
          </p>
          <DollarSign size={12} className="text-amber-500" />
        </div>
        <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{budgetRemaining}%</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Resets {data.resetTime}</p>
        <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${budgetRemaining}%` }}
          />
        </div>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-mono">
          {fmtUSD(data.weeklyUSD)} / {fmtUSD(data.budgetUSD)} used
        </p>
      </div>
    </div>
  );
}

// ─── 7-Day Spend Chart (pure CSS) ────────────────────────────────────────────

function SpendChart({ daily }: { daily: DailyEntry[] }) {
  const [currency, setCurrency] = useState<"USD" | "CAD">("USD");
  const [tooltip, setTooltip] = useState<{ entry: DailyEntry; x: number; y: number } | null>(null);

  const values = daily.map(d => currency === "USD" ? d.costUSD : d.costCAD);
  const max = Math.max(...values, 0.01);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          7-Day Spend
        </h2>
        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {(["USD", "CAD"] as const).map(c => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`text-xs px-3 py-1 transition-colors ${
                currency === c
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              } ${c === "CAD" ? "border-l border-zinc-200 dark:border-zinc-700" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex items-end gap-2 h-40" onMouseLeave={() => setTooltip(null)}>
        {daily.map((entry, i) => {
          const val   = currency === "USD" ? entry.costUSD : entry.costCAD;
          const heightPct = (val / max) * 100;
          // Gradient darkness by spend level
          const opacity = 0.35 + (val / max) * 0.65;

          return (
            <div
              key={entry.date}
              className="flex flex-col items-center flex-1 group cursor-default"
              onMouseEnter={e => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setTooltip({ entry, x: rect.left, y: rect.top });
              }}
            >
              <div className="w-full flex flex-col justify-end" style={{ height: "120px" }}>
                <div
                  className="w-full rounded-t-sm transition-all duration-300 group-hover:brightness-110"
                  style={{
                    height: `${Math.max(heightPct, 2)}%`,
                    backgroundColor: `rgba(59, 130, 246, ${opacity})`,
                  }}
                />
              </div>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-2 font-mono text-center leading-tight">
                {shortDate(entry.date)}
              </p>
              <p className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 font-mono">
                {currency === "USD" ? `$${val.toFixed(2)}` : `CA$${val.toFixed(2)}`}
              </p>
            </div>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-44 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg shadow-xl p-3 pointer-events-none z-20 text-[10px] leading-relaxed">
            <p className="font-semibold mb-1">{shortDate(tooltip.entry.date)}</p>
            <p>USD: <span className="font-mono">{fmtUSD(tooltip.entry.costUSD)}</span></p>
            <p>CAD: <span className="font-mono">{fmtCAD(tooltip.entry.costCAD)}</span></p>
            <p>Runs: <span className="font-mono">{tooltip.entry.runs}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Cost Table ─────────────────────────────────────────────────────────

type SortKey = "name" | "runs" | "tokensIn" | "tokensOut" | "cacheRead" | "costUSD" | "costCAD";
type SortDir = "asc" | "desc";

function AgentTable({ agents }: { agents: AgentRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("costUSD");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...agents].sort((a, b) => {
    const av = a[sortKey] as number | string;
    const bv = b[sortKey] as number | string;
    const cmp = typeof av === "string" ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalIn   = agents.reduce((s, a) => s + a.tokensIn,  0);
  const totalOut  = agents.reduce((s, a) => s + a.tokensOut, 0);
  const totalCache= agents.reduce((s, a) => s + a.cacheRead, 0);
  const totalUSD  = agents.reduce((s, a) => s + a.costUSD,   0);
  const totalCAD  = agents.reduce((s, a) => s + a.costCAD,   0);
  const totalRuns = agents.reduce((s, a) => s + a.runs,      0);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown size={10} className="opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp size={10} className="text-blue-500" />
      : <ChevronDown size={10} className="text-blue-500" />;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Agent Cost Breakdown
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              {([
                ["name",      "Agent"     ],
                [null,        "Model"     ],
                ["runs",      "Runs"      ],
                ["tokensIn",  "Tokens In" ],
                ["tokensOut", "Tokens Out"],
                ["cacheRead", "Cache Read"],
                ["costUSD",   "Cost USD"  ],
                ["costCAD",   "Cost CAD"  ],
              ] as [SortKey | null, string][]).map(([key, label]) => (
                <th
                  key={label}
                  className={`text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 select-none ${key ? "cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300" : ""}`}
                  onClick={() => key && handleSort(key)}
                >
                  <span className="flex items-center gap-1">
                    {label}
                    {key && <SortIcon col={key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/80">
            {sorted.map(agent => {
              const wikiUrl = `https://inotion.00raiser.space/search/${encodeURIComponent(agent.name)}`;
              return (
                <tr
                  key={agent.name}
                  className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer relative"
                  onClick={() => window.open(wikiUrl, "_blank")}
                >
                  {/* Agent name with tooltip */}
                  <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200 relative">
                    <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {agent.name}
                    </span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-4 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 w-52 leading-relaxed">
                      <div className="font-semibold mb-0.5">{agent.name}</div>
                      <div className="opacity-75">{agent.category}</div>
                      <div className="opacity-50 mt-0.5">Last: {new Date(agent.lastRun).toLocaleString()}</div>
                      <div className="mt-1 opacity-50 text-[9px]">Click to view in Wiki</div>
                    </div>
                  </td>

                  {/* Model badge */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${modelBadgeClass(agent.model)}`}>
                      {modelLabel(agent.model)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    {agent.runs > 0 ? agent.runs : "—"}
                  </td>

                  <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    {fmtTokens(agent.tokensIn)}
                  </td>

                  <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    {fmtTokens(agent.tokensOut)}
                  </td>

                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-500 font-mono">
                    {agent.cacheRead > 0 ? fmtTokens(agent.cacheRead) : "—"}
                  </td>

                  <td className={`px-4 py-3 text-xs font-semibold font-mono ${costColor(agent.costUSD)}`}>
                    {fmtUSD(agent.costUSD)}
                  </td>

                  <td className="px-4 py-3 text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                    {fmtCAD(agent.costCAD)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer totals */}
          <tfoot>
            <tr className="border-t-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
              <td className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Total
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-xs font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                {totalRuns}
              </td>
              <td className="px-4 py-3 text-xs font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                {fmtTokens(totalIn)}
              </td>
              <td className="px-4 py-3 text-xs font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                {fmtTokens(totalOut)}
              </td>
              <td className="px-4 py-3 text-xs font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                {fmtTokens(totalCache)}
              </td>
              <td className="px-4 py-3 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-50">
                {fmtUSD(totalUSD)}
              </td>
              <td className="px-4 py-3 text-xs font-semibold font-mono text-zinc-500 dark:text-zinc-400">
                {fmtCAD(totalCAD)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Category Donut (pure CSS conic-gradient) ─────────────────────────────────

function CategoryDonut({ categories }: { categories: CategoryEntry[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Build conic-gradient stops
  let angle = 0;
  const stops: string[] = [];
  const segments = categories.map(c => {
    const color = CATEGORY_COLORS[c.category] ?? "#94a3b8";
    const start = angle;
    const end   = angle + (c.pct / 100) * 360;
    stops.push(`${color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`);
    angle = end;
    return { ...c, color, start, end };
  });

  const gradient = `conic-gradient(from 0deg, ${stops.join(", ")})`;

  const activeCategory = hovered ? categories.find(c => c.category === hovered) : null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-5">
        Cost by Category
      </h2>

      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Donut ring */}
        <div className="relative flex-shrink-0">
          <div
            className="w-40 h-40 rounded-full transition-all duration-300"
            style={{
              background: gradient,
              mask: "radial-gradient(circle, transparent 48%, black 49%)",
              WebkitMask: "radial-gradient(circle, transparent 48%, black 49%)",
            }}
          />
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {activeCategory ? (
              <>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{fmtUSD(activeCategory.costUSD)}</p>
                <p className="text-[9px] text-zinc-500 dark:text-zinc-400 text-center leading-tight mt-0.5 max-w-[72px]">
                  {activeCategory.category}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center leading-tight">Today</p>
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Spend</p>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2.5 w-full">
          {segments.map(seg => (
            <div
              key={seg.category}
              className="flex items-center gap-2.5 cursor-default group"
              onMouseEnter={() => setHovered(seg.category)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0 transition-transform group-hover:scale-125"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 flex-1 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                {seg.category}
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{seg.pct}%</span>
              <span className="text-xs font-semibold font-mono text-zinc-700 dark:text-zinc-300 w-14 text-right">
                {fmtUSD(seg.costUSD)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
      {children}
    </h2>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CostsPage() {
  const [data, setData]       = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/costs");
        if (res.ok) {
          const json = await res.json();
          if (json.error) setError(json.error);
          else setData(json);
        } else {
          setError(`API error ${res.status}`);
        }
      } catch (e) {
        setError("Failed to load cost data");
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-8">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Cost Intelligence
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Token usage and spend across all autonomous agents. Resets weekly on Thursday 07:00 AM PST.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-5 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
              ))}
            </div>
            <div className="h-56 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="h-72 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>
        )}

        {data && (
          <>
            {/* Section 1: Summary Cards */}
            <section>
              <SectionLabel>Overview</SectionLabel>
              <div className="mt-3">
                <SummaryCards data={data} />
              </div>
            </section>

            {/* Section 2: 7-Day Spend Chart */}
            <section>
              <SectionLabel>7-Day Spend</SectionLabel>
              <div className="mt-3">
                <SpendChart daily={data.daily} />
              </div>
            </section>

            {/* Section 3: Agent Cost Table */}
            <section>
              <SectionLabel>Per-Agent Breakdown</SectionLabel>
              <div className="mt-3">
                <AgentTable agents={data.agents} />
              </div>
            </section>

            {/* Section 4: Category Donut */}
            <section>
              <SectionLabel>Cost Distribution</SectionLabel>
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CategoryDonut categories={data.categories} />

                {/* Model price reference card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
                    Model Pricing Reference
                  </h2>
                  <div className="space-y-4">
                    {[
                      { label: "Opus 4.6",   model: "anthropic/claude-opus-4-6",   input: 15.00, output: 75.00, cache: 1.50, pill: "opus"   },
                      { label: "Sonnet 4.6", model: "anthropic/claude-sonnet-4-6", input:  3.00, output: 15.00, cache: 0.30, pill: "sonnet" },
                      { label: "Haiku 4.6",  model: "anthropic/claude-haiku-4-6",  input:  0.25, output:  1.25, cache: 0.03, pill: "haiku"  },
                    ].map(m => (
                      <div key={m.label} className="flex items-start gap-3">
                        <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium flex-shrink-0 ${
                          m.pill === "opus"   ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700" :
                          m.pill === "sonnet" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700" :
                                                "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700"
                        }`}>
                          {m.label}
                        </span>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          <span className="font-mono">${m.input}/M</span> in
                          {" · "}
                          <span className="font-mono">${m.output}/M</span> out
                          {" · "}
                          <span className="font-mono">${m.cache}/M</span> cache
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                      1 USD = {data.cadRate.toFixed(4)} CAD (live rate)
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5: Token Reset Countdown */}
            <section>
              <TokenResetCountdown resetTime={data.resetTime} />
            </section>
          </>
        )}

    </div>
  );
}
