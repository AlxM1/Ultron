"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Search, Loader2, TrendingUp, TrendingDown, Minus, MessageSquare, Users, Calendar, ThumbsUp } from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */

interface SentimentData {
  keyword: string;
  total_matches: number;
  date_range: { from: string; to: string };
  sentiment: {
    positive: { count: number; percentage: number; top_themes: string[] };
    negative: { count: number; percentage: number; top_themes: string[] };
    neutral: { count: number; percentage: number };
  };
  timeline: { month: string; positive: number; negative: number; neutral: number }[];
  top_comments: { text: string; sentiment: string; likes: number; date: string; creator: string; author: string }[];
  creators_breakdown: { creator: string; positive: number; negative: number; neutral: number }[];
}

/* ── Constants ─────────────────────────────────────────── */

const SUGGESTED = ["AI", "OpenAI", "ChatGPT", "startup", "automation", "crypto", "scam", "money", "future", "agent"];
const COLORS = { positive: "#22c55e", negative: "#ef4444", neutral: "#52525b" };
const GRADIENT_COLORS = {
  positive: { start: "#22c55e", end: "#16a34a" },
  negative: { start: "#ef4444", end: "#dc2626" },
  neutral: { start: "#71717a", end: "#52525b" },
};

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
    <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs font-medium text-zinc-400 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-zinc-300 capitalize">{p.dataKey}</span>
          </div>
          <span className="font-mono font-medium text-zinc-100">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Donut Center Label ────────────────────────────────── */

function DonutCenter({ total }: { total: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span className="text-3xl font-bold text-zinc-100 tracking-tight">{formatNumber(total)}</span>
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">comments</span>
    </div>
  );
}

/* ── Stacked Bar ───────────────────────────────────────── */

function SentimentBar({ positive, negative, neutral }: { positive: number; negative: number; neutral: number }) {
  const total = positive + negative + neutral;
  if (total === 0) return <div className="h-2 bg-zinc-800 rounded-full" />;
  const pPct = (positive / total) * 100;
  const nPct = (negative / total) * 100;
  return (
    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
      {pPct > 0 && <div className="bg-green-500 transition-all duration-700" style={{ width: `${pPct}%` }} />}
      {nPct > 0 && <div className="bg-red-500 transition-all duration-700" style={{ width: `${nPct}%` }} />}
      <div className="bg-zinc-600 flex-1 transition-all duration-700" />
    </div>
  );
}

/* ── Component ─────────────────────────────────────────── */

export default function SentimentPage() {
  const [keyword, setKeyword] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SentimentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (kw?: string) => {
    const q = kw || keyword;
    if (!q.trim()) return;
    if (kw) setKeyword(kw);
    setLoading(true);
    setError(null);
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

  const pieData = data
    ? [
        { name: "Positive", value: data.sentiment.positive.count, color: COLORS.positive },
        { name: "Negative", value: data.sentiment.negative.count, color: COLORS.negative },
        { name: "Neutral", value: data.sentiment.neutral.count, color: COLORS.neutral },
      ]
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
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100 mb-2">
          Sentiment Intelligence
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base max-w-2xl">
          Search any keyword across 700K+ comments to understand audience perception, track sentiment shifts over time, and identify opportunities.
        </p>
      </section>

      {/* ── Search ────────────────────────────────────── */}
      <section className="mb-8">
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="Search any keyword across all comments..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
              />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-3 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 transition-all w-[140px]"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-3 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 transition-all w-[140px]"
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
            <span className="text-[10px] uppercase tracking-wider text-zinc-600 mr-1 self-center">Try:</span>
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => doSearch(s)}
                className="text-xs bg-zinc-800/50 border border-zinc-700/30 hover:border-amber-500/30 text-zinc-400 hover:text-amber-400 rounded-lg px-3 py-1.5 transition-all hover:bg-zinc-800"
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
            <div className="w-16 h-16 rounded-full border-2 border-zinc-800" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
          </div>
          <p className="text-zinc-500 text-sm mt-6 animate-pulse">Analyzing {keyword ? `"${keyword}"` : ""}...</p>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────── */}
      {error && !loading && (
        <div className="text-center py-16">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────── */}
      {data && !loading && (
        <div ref={resultsRef} className="space-y-6 animate-in fade-in duration-500">
          {/* Result header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-zinc-100">
                  &ldquo;{data.keyword}&rdquo;
                </h2>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                  data.sentiment.positive.percentage >= 60
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : data.sentiment.negative.percentage >= 40
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}>
                  {sentimentLabel}
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                {data.total_matches.toLocaleString()} comments analyzed from {data.date_range.from} to {data.date_range.to}
              </p>
            </div>
          </div>

          {/* ── Metric Cards ──────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Positive */}
            <div className="group relative overflow-hidden bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 hover:border-green-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/8 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-sm font-medium text-zinc-400">Positive</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <AnimatedNumber value={data.sentiment.positive.percentage} suffix="%" className="text-4xl font-bold text-green-400 tabular-nums" />
                </div>
                <p className="text-xs text-zinc-600 mt-2">
                  {data.sentiment.positive.count.toLocaleString()} comments
                </p>
              </div>
            </div>

            {/* Negative */}
            <div className="group relative overflow-hidden bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 hover:border-red-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-red-500/8 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-sm font-medium text-zinc-400">Negative</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <AnimatedNumber value={data.sentiment.negative.percentage} suffix="%" className="text-4xl font-bold text-red-400 tabular-nums" />
                </div>
                <p className="text-xs text-zinc-600 mt-2">
                  {data.sentiment.negative.count.toLocaleString()} comments
                </p>
              </div>
            </div>

            {/* Neutral */}
            <div className="group relative overflow-hidden bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 hover:border-zinc-600/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-zinc-500/8 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Minus className="w-4 h-4 text-zinc-500" />
                  </div>
                  <span className="text-sm font-medium text-zinc-400">Neutral</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <AnimatedNumber value={data.sentiment.neutral.percentage} suffix="%" className="text-4xl font-bold text-zinc-400 tabular-nums" />
                </div>
                <p className="text-xs text-zinc-600 mt-2">
                  {data.sentiment.neutral.count.toLocaleString()} comments
                </p>
              </div>
            </div>
          </div>

          {/* ── Charts Row ────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Donut -- 2 cols */}
            <div className="lg:col-span-2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-6">Distribution</h3>
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
                    <span className="text-[11px] text-zinc-400">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline -- 3 cols */}
            <div className="lg:col-span-3 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-6">Sentiment Over Time</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.timeline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPositive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.positive} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.positive} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradNegative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.negative} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.negative} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradNeutral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.neutral} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={COLORS.neutral} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="positive" stroke={COLORS.positive} strokeWidth={2} fill="url(#gradPositive)" animationDuration={1200} />
                  <Area type="monotone" dataKey="negative" stroke={COLORS.negative} strokeWidth={2} fill="url(#gradNegative)" animationDuration={1200} animationBegin={200} />
                  <Area type="monotone" dataKey="neutral" stroke={COLORS.neutral} strokeWidth={1.5} fill="url(#gradNeutral)" animationDuration={1200} animationBegin={400} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Themes ────────────────────────────────── */}
          {(data.sentiment.positive.top_themes?.length > 0 || data.sentiment.negative.top_themes?.length > 0) && (
            <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-5">Detected Themes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {data.sentiment.positive.top_themes?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-green-500/60 mb-3">Positive Signals</p>
                    <div className="flex flex-wrap gap-2">
                      {data.sentiment.positive.top_themes.map((t) => (
                        <span key={t} className="text-xs bg-green-500/8 text-green-400/90 border border-green-500/15 rounded-lg px-3 py-1.5 hover:bg-green-500/12 transition-colors cursor-default">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {data.sentiment.negative.top_themes?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-red-500/60 mb-3">Negative Signals</p>
                    <div className="flex flex-wrap gap-2">
                      {data.sentiment.negative.top_themes.map((t) => (
                        <span key={t} className="text-xs bg-red-500/8 text-red-400/90 border border-red-500/15 rounded-lg px-3 py-1.5 hover:bg-red-500/12 transition-colors cursor-default">
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
            <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Creator Audiences</h3>
              </div>
              <div className="space-y-4">
                {data.creators_breakdown.map((c) => {
                  const total = c.positive + c.negative + c.neutral;
                  return (
                    <div key={c.creator} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition-colors">{c.creator}</span>
                        <div className="flex items-center gap-4 text-[11px] tabular-nums">
                          <span className="text-green-400">{c.positive}</span>
                          <span className="text-red-400">{c.negative}</span>
                          <span className="text-zinc-500">{c.neutral}</span>
                          <span className="text-zinc-600 font-medium">{total}</span>
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
            <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <MessageSquare className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Highest Engagement Comments
                </h3>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                {data.top_comments.map((c, i) => (
                  <div
                    key={i}
                    className={`relative pl-4 py-4 pr-5 rounded-xl border transition-all duration-200 hover:translate-x-0.5 ${
                      c.sentiment === "positive"
                        ? "border-green-500/10 bg-green-500/[0.03] hover:border-green-500/20"
                        : c.sentiment === "negative"
                        ? "border-red-500/10 bg-red-500/[0.03] hover:border-red-500/20"
                        : "border-zinc-800/50 bg-zinc-800/20 hover:border-zinc-700/50"
                    }`}
                  >
                    <div
                      className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${
                        c.sentiment === "positive"
                          ? "bg-green-500/60"
                          : c.sentiment === "negative"
                          ? "bg-red-500/60"
                          : "bg-zinc-600/40"
                      }`}
                    />
                    <p className="text-sm text-zinc-200 leading-relaxed mb-3 ml-2">{c.text}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 ml-2 text-[11px]">
                      <span className="font-medium text-zinc-300">{c.creator}</span>
                      <span className="text-zinc-600">@{c.author}</span>
                      <span className="text-zinc-600">{c.date}</span>
                      <div className="flex items-center gap-1 ml-auto text-amber-400/80">
                        <ThumbsUp className="w-3 h-3" />
                        <span className="font-medium">{c.likes.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty State ───────────────────────────────── */}
      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
            <Search className="w-7 h-7 text-zinc-700" />
          </div>
          <p className="text-zinc-500 text-sm mb-1">Enter a keyword to begin analysis</p>
          <p className="text-zinc-600 text-xs">Search across 700K+ comments from {new Date().getFullYear() - 14} years of creator content</p>
        </div>
      )}
    </div>
  );
}
