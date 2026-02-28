"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, BarChart, Bar,
} from "recharts";
import { Search, Loader2, TrendingUp, TrendingDown, Minus, MessageSquare, Users, Calendar, ThumbsUp, ChevronUp, ChevronDown, Youtube } from "lucide-react";

/* ── Platform Icons ────────────────────────────────────── */

function PlatformIcon({ platform, size = 14 }: { platform: string; size?: number }) {
  if (platform === "youtube") {
    return <Youtube style={{ width: size, height: size }} className="text-red-500" />;
  }
  if (platform === "reddit") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-orange-500">
        <circle cx="12" cy="12" r="11" fill="currentColor" />
        <text x="12" y="16.5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif">R</text>
      </svg>
    );
  }
  if (platform === "x") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" className="fill-zinc-800 dark:fill-zinc-200" />
        <text x="12" y="16.5" textAnchor="middle" className="fill-zinc-100 dark:fill-zinc-900" fontSize="14" fontWeight="bold" fontFamily="sans-serif">&#x1D54F;</text>
      </svg>
    );
  }
  return null;
}

function PlatformBadge({ platform }: { platform: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    youtube: { bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20", text: "text-red-700 dark:text-red-400", label: "YouTube" },
    reddit: { bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20", text: "text-orange-700 dark:text-orange-400", label: "Reddit" },
    x: { bg: "bg-zinc-100 dark:bg-zinc-700/30 border-zinc-300 dark:border-zinc-600/30", text: "text-zinc-700 dark:text-zinc-300", label: "X" },
  };
  const c = config[platform] || config.youtube;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${c.bg} ${c.text}`}>
      <PlatformIcon platform={platform} size={10} />
      {c.label}
    </span>
  );
}

/* ── Types ─────────────────────────────────────────────── */

interface PlatformBreakdown {
  [key: string]: { positive: number; negative: number; neutral: number; total: number };
}

interface SentimentData {
  keyword: string;
  total_matches: number;
  date_range: { from: string; to: string };
  sentiment: {
    positive: { count: number; percentage: number; top_themes: string[] };
    negative: { count: number; percentage: number; top_themes: string[] };
    neutral: { count: number; percentage: number };
  };
  platform_breakdown?: PlatformBreakdown;
  timeline: { month: string; positive: number; negative: number; neutral: number }[];
  top_comments: { text: string; sentiment: string; likes: number; date: string; creator: string; author: string; platform?: string }[];
  creators_breakdown: { creator: string; positive: number; negative: number; neutral: number }[];
}

/* ── Constants ─────────────────────────────────────────── */

const SUGGESTED = ["AI", "OpenAI", "ChatGPT", "startup", "automation", "crypto", "scam", "money", "future", "agent"];
const COLORS = { positive: "#22c55e", negative: "#ef4444", neutral: "#52525b" };
const PLATFORM_COLORS: Record<string, string> = { youtube: "#ef4444", reddit: "#f97316", x: "#71717a" };

/* ── Helpers ───────────────────────────────────────────── */

function defaultFrom() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}

function defaultTo() {
  return new Date().toISOString().split("T")[0];
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

/* ── Animated Counter ──────────────────────────────────── */

function AnimatedNumber({ value, suffix = "", className = "" }: { value: number; suffix?: string; className?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    const duration = 800;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = value;
    }
    requestAnimationFrame(animate);
  }, [value]);

  return <span className={className}>{display.toLocaleString()}{suffix}</span>;
}

/* ── Custom Tooltip ────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 shadow-lg dark:shadow-2xl">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-zinc-600 dark:text-zinc-300 capitalize">{p.dataKey}</span>
          </div>
          <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Donut Center Label ────────────────────────────────── */

function DonutCenter({ total }: { total: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{formatNumber(total)}</span>
      <span className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mt-0.5">comments</span>
    </div>
  );
}

/* ── Stacked Bar ───────────────────────────────────────── */

function SentimentBar({ positive, negative, neutral }: { positive: number; negative: number; neutral: number }) {
  const total = positive + negative + neutral;
  if (total === 0) return <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full" />;
  const pPct = (positive / total) * 100;
  const nPct = (negative / total) * 100;
  return (
    <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex">
      {pPct > 0 && <div className="bg-green-500 transition-all duration-700" style={{ width: `${pPct}%` }} />}
      {nPct > 0 && <div className="bg-red-500 transition-all duration-700" style={{ width: `${nPct}%` }} />}
      <div className="bg-zinc-400 dark:bg-zinc-600 flex-1 transition-all duration-700" />
    </div>
  );
}

/* ── Percentage Arrow ──────────────────────────────────── */

function PercentArrow({ value, type }: { value: number; type: "positive" | "negative" | "neutral" }) {
  if (type === "neutral") return null;
  const isHigh = type === "positive" ? value >= 50 : value >= 30;
  if (type === "positive") {
    return isHigh
      ? <ChevronUp className="w-4 h-4 text-green-500 -ml-0.5" />
      : <ChevronDown className="w-4 h-4 text-green-400/50 -ml-0.5" />;
  }
  return isHigh
    ? <ChevronUp className="w-4 h-4 text-red-500 -ml-0.5" />
    : <ChevronDown className="w-4 h-4 text-red-400/50 -ml-0.5" />;
}

/* ── Component ─────────────────────────────────────────── */

export default function SentimentPage() {
  const [keyword, setKeyword] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SentimentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (kw?: string) => {
    const q = kw || keyword;
    if (!q.trim()) return;
    if (kw) setKeyword(kw);
    setLoading(true);
    setError(null);
    setPlatformFilter(null);
    try {
      const res = await fetch(
        `/api/comments/sentiment?keyword=${encodeURIComponent(q)}&from=${from}&to=${to}&limit=2000`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: any) {
      setError(e.message || "Search failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [keyword, from, to]);

  const filteredComments = data?.top_comments?.filter(c => !platformFilter || c.platform === platformFilter) || [];

  const pieData = data
    ? [
        { name: "Positive", value: data.sentiment.positive.count, color: COLORS.positive },
        { name: "Negative", value: data.sentiment.negative.count, color: COLORS.negative },
        { name: "Neutral", value: data.sentiment.neutral.count, color: COLORS.neutral },
      ]
    : [];

  const platformBarData = data?.platform_breakdown
    ? Object.entries(data.platform_breakdown)
        .filter(([_, v]) => v.total > 0)
        .map(([platform, v]) => ({
          platform: platform === "x" ? "X" : platform.charAt(0).toUpperCase() + platform.slice(1),
          positive: v.positive,
          negative: v.negative,
          neutral: v.neutral,
          total: v.total,
        }))
    : [];

  const sentimentLabel = data
    ? data.sentiment.positive.percentage >= 60
      ? "Overwhelmingly Positive"
      : data.sentiment.positive.percentage >= 40
      ? "Generally Positive"
      : data.sentiment.negative.percentage >= 40
      ? "Mostly Negative"
      : "Mixed Sentiment"
    : "";

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Hero ──────────────────────────────────────── */}
      <section className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
          Sentiment Intelligence
        </h1>
        <p className="text-zinc-500 dark:text-zinc-500 text-sm sm:text-base max-w-2xl">
          Search any keyword across YouTube comments, Reddit posts, and X to understand audience perception across platforms.
        </p>
      </section>

      {/* ── Search ────────────────────────────────────── */}
      <section className="mb-8">
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-5 sm:p-6 shadow-sm dark:shadow-none">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="Search across YouTube, Reddit, and X..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
              />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-3 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none focus:border-amber-500/50 transition-all w-[140px]"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-3 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none focus:border-amber-500/50 transition-all w-[140px]"
                />
              </div>
              <button
                onClick={() => doSearch()}
                disabled={loading || !keyword.trim()}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-xl px-6 py-3 text-sm transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Analyze
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-600 mr-1 self-center">Try:</span>
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => doSearch(s)}
                className="text-xs bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/30 hover:border-amber-500/50 text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-lg px-3 py-1.5 transition-all hover:bg-zinc-150 dark:hover:bg-zinc-800"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Loading ───────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-zinc-200 dark:border-zinc-800" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
          </div>
          <p className="text-zinc-500 text-sm mt-6 animate-pulse">Analyzing {keyword ? `"${keyword}"` : ""} across all platforms...</p>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────── */}
      {error && !loading && (
        <div className="text-center py-16">
          <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────── */}
      {data && !loading && (
        <div ref={resultsRef} className="space-y-6 animate-in fade-in duration-500">
          {/* Result header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  &ldquo;{data.keyword}&rdquo;
                </h2>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                  data.sentiment.positive.percentage >= 60
                    ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20"
                    : data.sentiment.negative.percentage >= 40
                    ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                }`}>
                  {sentimentLabel}
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                {data.total_matches.toLocaleString()} results analyzed from {data.date_range.from} to {data.date_range.to}
              </p>
            </div>
          </div>

          {/* ── Metric Cards ──────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Positive */}
            <div className="group relative overflow-hidden bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm dark:shadow-none hover:border-green-300 dark:hover:border-green-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 dark:bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-green-200 dark:group-hover:bg-green-500/8 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
                  </div>
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Positive</span>
                </div>
                <div className="flex items-center gap-1">
                  <AnimatedNumber value={data.sentiment.positive.percentage} suffix="%" className="text-4xl font-bold text-green-600 dark:text-green-400 tabular-nums" />
                  <PercentArrow value={data.sentiment.positive.percentage} type="positive" />
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-2">
                  {data.sentiment.positive.count.toLocaleString()} comments
                </p>
              </div>
            </div>

            {/* Negative */}
            <div className="group relative overflow-hidden bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm dark:shadow-none hover:border-red-300 dark:hover:border-red-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 dark:bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-red-200 dark:group-hover:bg-red-500/8 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-500" />
                  </div>
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Negative</span>
                </div>
                <div className="flex items-center gap-1">
                  <AnimatedNumber value={data.sentiment.negative.percentage} suffix="%" className="text-4xl font-bold text-red-600 dark:text-red-400 tabular-nums" />
                  <PercentArrow value={data.sentiment.negative.percentage} type="negative" />
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-2">
                  {data.sentiment.negative.count.toLocaleString()} comments
                </p>
              </div>
            </div>

            {/* Neutral */}
            <div className="group relative overflow-hidden bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm dark:shadow-none hover:border-zinc-300 dark:hover:border-zinc-600/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-100 dark:bg-zinc-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-500/8 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Minus className="w-4 h-4 text-zinc-500" />
                  </div>
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Neutral</span>
                </div>
                <div className="flex items-center gap-1">
                  <AnimatedNumber value={data.sentiment.neutral.percentage} suffix="%" className="text-4xl font-bold text-zinc-500 dark:text-zinc-400 tabular-nums" />
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-2">
                  {data.sentiment.neutral.count.toLocaleString()} comments
                </p>
              </div>
            </div>
          </div>

          {/* ── Charts Row ────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Donut -- 2 cols */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm dark:shadow-none">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-6">Distribution</h3>
              <div className="relative">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={115}
                      dataKey="value"
                      strokeWidth={0}
                      animationBegin={0}
                      animationDuration={1000}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <DonutCenter total={data.total_matches} />
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline -- 3 cols */}
            <div className="lg:col-span-3 bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm dark:shadow-none">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-6">Sentiment Over Time</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPositive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.positive} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.positive} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradNegative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.negative} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.negative} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradNeutral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.neutral} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={COLORS.neutral} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" vertical={false} />
                  <XAxis dataKey="month" className="[&_text]:fill-zinc-400 dark:[&_text]:fill-zinc-500" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis className="[&_text]:fill-zinc-400 dark:[&_text]:fill-zinc-500" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="positive" stroke={COLORS.positive} strokeWidth={2} fill="url(#gradPositive)" animationDuration={1200} />
                  <Area type="monotone" dataKey="negative" stroke={COLORS.negative} strokeWidth={2} fill="url(#gradNegative)" animationDuration={1200} animationBegin={200} />
                  <Area type="monotone" dataKey="neutral" stroke={COLORS.neutral} strokeWidth={1.5} fill="url(#gradNeutral)" animationDuration={1200} animationBegin={400} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Platform Breakdown ────────────────────── */}
          {platformBarData.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm dark:shadow-none">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-6">Platform Breakdown</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar chart */}
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={platformBarData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" vertical={false} />
                    <XAxis dataKey="platform" className="[&_text]:fill-zinc-400 dark:[&_text]:fill-zinc-500" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis className="[&_text]:fill-zinc-400 dark:[&_text]:fill-zinc-500" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="positive" fill={COLORS.positive} radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="neutral" fill={COLORS.neutral} radius={[0, 0, 0, 0]} stackId="a" />
                    <Bar dataKey="negative" fill={COLORS.negative} radius={[0, 0, 4, 4]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
                {/* Platform cards */}
                <div className="space-y-3">
                  {platformBarData.map((p) => {
                    const key = p.platform.toLowerCase();
                    return (
                      <div key={key} className="flex items-center gap-4 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20">
                        <PlatformIcon platform={key} size={20} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{p.platform}</span>
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{p.total.toLocaleString()} total</span>
                          </div>
                          <SentimentBar positive={p.positive} negative={p.negative} neutral={p.neutral} />
                          <div className="flex gap-4 mt-1 text-[10px] tabular-nums">
                            <span className="text-green-600 dark:text-green-400">{p.positive} pos</span>
                            <span className="text-red-600 dark:text-red-400">{p.negative} neg</span>
                            <span className="text-zinc-400 dark:text-zinc-500">{p.neutral} neu</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Themes ────────────────────────────────── */}
          {(data.sentiment.positive.top_themes?.length > 0 || data.sentiment.negative.top_themes?.length > 0) && (
            <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm dark:shadow-none">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-5">Detected Themes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {data.sentiment.positive.top_themes?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-green-600/60 dark:text-green-500/60 mb-3">Positive Signals</p>
                    <div className="flex flex-wrap gap-2">
                      {data.sentiment.positive.top_themes.map((t) => (
                        <span key={t} className="text-xs bg-green-50 dark:bg-green-500/8 text-green-700 dark:text-green-400/90 border border-green-200 dark:border-green-500/15 rounded-lg px-3 py-1.5 hover:bg-green-100 dark:hover:bg-green-500/12 transition-colors cursor-default">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {data.sentiment.negative.top_themes?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-red-600/60 dark:text-red-500/60 mb-3">Negative Signals</p>
                    <div className="flex flex-wrap gap-2">
                      {data.sentiment.negative.top_themes.map((t) => (
                        <span key={t} className="text-xs bg-red-50 dark:bg-red-500/8 text-red-700 dark:text-red-400/90 border border-red-200 dark:border-red-500/15 rounded-lg px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-500/12 transition-colors cursor-default">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Creator Breakdown ─────────────────────── */}
          {data.creators_breakdown?.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm dark:shadow-none">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Creator Audiences</h3>
              </div>
              <div className="space-y-4">
                {data.creators_breakdown.map((c) => {
                  const total = c.positive + c.negative + c.neutral;
                  return (
                    <div key={c.creator} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{c.creator}</span>
                        <div className="flex items-center gap-4 text-[11px] tabular-nums">
                          <span className="text-green-600 dark:text-green-400">{c.positive}</span>
                          <span className="text-red-600 dark:text-red-400">{c.negative}</span>
                          <span className="text-zinc-400 dark:text-zinc-500">{c.neutral}</span>
                          <span className="text-zinc-500 dark:text-zinc-600 font-medium">{total}</span>
                        </div>
                      </div>
                      <SentimentBar positive={c.positive} negative={c.negative} neutral={c.neutral} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Top Comments ──────────────────────────── */}
          {data.top_comments?.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-6 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Highest Engagement
                  </h3>
                </div>
                {/* Platform filter buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPlatformFilter(null)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                      !platformFilter
                        ? "bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400"
                        : "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/30 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                    }`}
                  >
                    All
                  </button>
                  {(["youtube", "reddit", "x"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatformFilter(platformFilter === p ? null : p)}
                      className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                        platformFilter === p
                          ? p === "youtube" ? "bg-red-50 dark:bg-red-500/15 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400"
                            : p === "reddit" ? "bg-orange-50 dark:bg-orange-500/15 border-orange-300 dark:border-orange-500/30 text-orange-700 dark:text-orange-400"
                            : "bg-zinc-200 dark:bg-zinc-700/40 border-zinc-400 dark:border-zinc-500/30 text-zinc-700 dark:text-zinc-300"
                          : "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/30 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      <PlatformIcon platform={p} size={10} />
                      {p === "x" ? "X" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredComments.map((c, i) => (
                  <div
                    key={i}
                    className={`relative pl-4 py-4 pr-5 rounded-xl border transition-all duration-200 hover:translate-x-0.5 hover:shadow-md dark:hover:shadow-none ${
                      c.sentiment === "positive"
                        ? "border-green-200 dark:border-green-500/10 bg-green-50/50 dark:bg-green-500/[0.03] hover:border-green-300 dark:hover:border-green-500/20"
                        : c.sentiment === "negative"
                        ? "border-red-200 dark:border-red-500/10 bg-red-50/50 dark:bg-red-500/[0.03] hover:border-red-300 dark:hover:border-red-500/20"
                        : "border-zinc-200 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20 hover:border-zinc-300 dark:hover:border-zinc-700/50"
                    }`}
                  >
                    <div
                      className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${
                        c.sentiment === "positive"
                          ? "bg-green-500/60"
                          : c.sentiment === "negative"
                          ? "bg-red-500/60"
                          : "bg-zinc-400/40 dark:bg-zinc-600/40"
                      }`}
                    />
                    <p className="text-[13px] text-zinc-700 dark:text-zinc-200 leading-relaxed mb-3 ml-2">{c.text}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-2 text-[11px]">
                      <PlatformBadge platform={c.platform || "youtube"} />
                      <span className="font-medium text-zinc-800 dark:text-zinc-300">{c.creator}</span>
                      <span className="text-zinc-400 dark:text-zinc-600">@{c.author}</span>
                      <span className="text-zinc-400 dark:text-zinc-600">{c.date}</span>
                      <div className="flex items-center gap-1 ml-auto text-amber-500 dark:text-amber-400/80">
                        <ThumbsUp className="w-3 h-3" />
                        <span className="font-medium">{c.likes.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredComments.length === 0 && (
                  <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">No results for this platform filter</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty State ───────────────────────────────── */}
      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-6">
            <Search className="w-7 h-7 text-zinc-400 dark:text-zinc-700" />
          </div>
          <p className="text-zinc-500 text-sm mb-1">Enter a keyword to begin analysis</p>
          <p className="text-zinc-400 dark:text-zinc-600 text-xs">Search across YouTube, Reddit, and X</p>
        </div>
      )}
    </div>
  );
}
