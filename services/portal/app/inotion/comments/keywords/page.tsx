"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, X, Tag, Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Treemap,
} from "recharts";
import ThemeToggle from "../../../components/inotion/ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_COMMENTS_API || "/api/comments";

// ─── Category colors ──────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  ai: "#f59e0b",
  tools: "#06b6d4",
  business: "#22c55e",
  crypto: "#a855f7",
  uncategorized: "#71717a",
};
const LINE_COLORS = ["#f59e0b", "#06b6d4", "#22c55e", "#a855f7", "#ef4444", "#ec4899", "#3b82f6", "#14b8a6"];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Keyword {
  word: string;
  count: number;
  sentiment: { positive: number; negative: number; neutral: number };
  trend_pct: number;
  category: string;
}

interface TimeseriesEntry {
  word: string;
  data: { date: string; count: number }[];
}

// ─── Custom Treemap Content ───────────────────────────────────────────────────
function TreemapContent(props: any) {
  const { x, y, width, height, word, count, fill } = props;
  if (width < 40 || height < 24) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#18181b" strokeWidth={2} rx={4} />
      {width > 60 && height > 36 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fafafa" fontSize={width > 100 ? 13 : 10} fontWeight={600}>
            {word}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#a1a1aa" fontSize={9}>
            {count?.toLocaleString()}
          </text>
        </>
      )}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesEntry[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [heatmapCreators, setHeatmapCreators] = useState<string[]>([]);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);

  // Fetch keywords
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/keywords?days=30&limit=100`);
        if (!res.ok) throw new Error("api");
        const data: Keyword[] = await res.json();
        setKeywords(data);
      } catch {
        setKeywords([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Pick top 5 trending as initial selection
  useEffect(() => {
    if (keywords.length && selectedWords.length === 0) {
      const top5 = [...keywords].sort((a, b) => b.trend_pct - a.trend_pct).slice(0, 5).map((k) => k.word);
      setSelectedWords(top5);
    }
  }, [keywords]);

  // Fetch timeseries whenever selectedWords changes
  useEffect(() => {
    if (!selectedWords.length) { setTimeseries([]); return; }
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/keywords/timeseries?keywords=${selectedWords.join(",")}&days=90&interval=week`
        );
        if (!res.ok) throw new Error("api");
        const data = await res.json();
        setTimeseries(data.keywords || []);
      } catch {
        setTimeseries([]);
      }
    })();
  }, [selectedWords]);

  // Fetch heatmap data
  useEffect(() => {
    if (keywords.length === 0) return;
    const heatmapKeywords = keywords.slice(0, 20).map((k) => k.word);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/keywords/heatmap?keywords=${heatmapKeywords.join(",")}`);
        if (!res.ok) throw new Error("api");
        const data = await res.json();
        setHeatmapCreators(data.creators || []);
        setHeatmapData(data.matrix || []);
      } catch {
        setHeatmapCreators([]);
        setHeatmapData([]);
      }
    })();
  }, [keywords]);

  const toggleWord = useCallback((word: string) => {
    setSelectedWords((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]
    );
  }, []);

  const addFromSearch = useCallback(() => {
    const w = searchInput.trim().toLowerCase();
    if (w && !selectedWords.includes(w)) {
      setSelectedWords((prev) => [...prev, w]);
    }
    setSearchInput("");
  }, [searchInput, selectedWords]);

  // Bubble data (top 80)
  const bubbles = useMemo(() => keywords.slice(0, 80), [keywords]);
  const maxCount = useMemo(() => Math.max(...bubbles.map((k) => k.count), 1), [bubbles]);

  // Treemap data
  const treemapData = useMemo(() => {
    return keywords.slice(0, 50).map((k) => {
      const base = CATEGORY_COLORS[k.category] || CATEGORY_COLORS.uncategorized;
      const brightness = 0.4 + k.sentiment.positive * 0.6;
      return {
        word: k.word,
        count: k.count,
        fill: base + Math.round(brightness * 255).toString(16).padStart(2, "0"),
      };
    });
  }, [keywords]);

  // Merged timeseries for chart
  const mergedTimeseries = useMemo(() => {
    if (!timeseries.length) return [];
    const dateMap: Record<string, Record<string, number>> = {};
    timeseries.forEach((ts) => {
      ts.data.forEach((d) => {
        if (!dateMap[d.date]) dateMap[d.date] = {};
        dateMap[d.date][ts.word] = d.count;
      });
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date: date.slice(5), ...vals }));
  }, [timeseries]);

  // Heatmap
  const heatmapKeywords = useMemo(() => keywords.slice(0, 20).map((k) => k.word), [keywords]);
  const heatmapMax = useMemo(() => Math.max(...heatmapData.flat(), 1), [heatmapData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-amber-500" />
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800/50">
          <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/inotion" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <ArrowLeft size={14} />
              </Link>
              <Link href="/inotion/comments" className="text-zinc-500 hover:text-zinc-300 transition-colors">Comments</Link>
              <span className="text-zinc-700">/</span>
              <h1 className="text-sm font-semibold text-amber-500">Keywords</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex items-center justify-center h-[60vh] text-zinc-500 text-sm">No keyword data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800/50">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/inotion" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <ArrowLeft size={14} />
            </Link>
            <Link href="/inotion/comments" className="text-zinc-500 hover:text-zinc-300 transition-colors">Comments</Link>
            <span className="text-zinc-700">/</span>
            <h1 className="text-sm font-semibold text-amber-500">Keywords</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <Link href="/inotion/comments" className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700">
                Overview
              </Link>
              <Link href="/inotion/comments/trending" className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700">
                Trending
              </Link>
              <Link href="/inotion/comments/opportunities" className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700">
                Opportunities
              </Link>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* ── 1. Bubble Map ─────────────────────────────────────────────────── */}
        <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Tag size={14} className="text-amber-500" /> Keyword Bubble Map
            </h2>
            <span className="text-[10px] text-zinc-600">Click to track in trends</span>
          </div>
          <div className="relative w-full overflow-hidden" style={{ height: 420 }}>
            <svg width="100%" height="100%" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet">
              {bubbles.map((k, i) => {
                const minR = 12, maxR = 55;
                const r = minR + (k.count / maxCount) * (maxR - minR);
                const cols = Math.ceil(Math.sqrt(bubbles.length * 2.5));
                const col = i % cols;
                const row = Math.floor(i / cols);
                const cx = 50 + (col / cols) * 900;
                const cy = 30 + row * (400 / Math.ceil(bubbles.length / cols));
                const color = CATEGORY_COLORS[k.category] || CATEGORY_COLORS.uncategorized;
                const isSelected = selectedWords.includes(k.word);
                return (
                  <g key={k.word} onClick={() => toggleWord(k.word)} style={{ cursor: "pointer" }}>
                    <circle
                      cx={cx} cy={cy} r={r}
                      fill={color}
                      fillOpacity={isSelected ? 0.9 : 0.35}
                      stroke={isSelected ? "#fafafa" : color}
                      strokeWidth={isSelected ? 2 : 0.5}
                      strokeOpacity={0.5}
                    />
                    {r > 18 && (
                      <text x={cx} y={cy + 1} textAnchor="middle" fill="#fafafa" fontSize={r > 35 ? 12 : r > 25 ? 10 : 8} fontWeight={500} pointerEvents="none">
                        {k.word}
                      </text>
                    )}
                    <title>{`${k.word}: ${k.count.toLocaleString()} mentions\nPositive: ${(k.sentiment.positive * 100).toFixed(0)}% | Negative: ${(k.sentiment.negative * 100).toFixed(0)}% | Neutral: ${(k.sentiment.neutral * 100).toFixed(0)}%\nTrend: ${k.trend_pct > 0 ? "+" : ""}${k.trend_pct}%`}</title>
                  </g>
                );
              })}
            </svg>
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-3 justify-center">
            {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
              <div key={cat} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {cat}
              </div>
            ))}
          </div>
        </section>

        {/* ── 2 & 3. Treemap + Trends side by side ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Treemap */}
          <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Keyword Treemap</h2>
            <ResponsiveContainer width="100%" height={360}>
              <Treemap
                data={treemapData}
                dataKey="count"
                nameKey="word"
                content={<TreemapContent />}
                isAnimationActive={false}
              />
            </ResponsiveContainer>
          </section>

          {/* Trends */}
          <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-300">Keyword Trends</h2>
            </div>
            {/* Search input */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFromSearch()}
                  placeholder="Add keyword..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
            {/* Selected pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedWords.map((w, i) => (
                <span key={w} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: LINE_COLORS[i % LINE_COLORS.length], color: LINE_COLORS[i % LINE_COLORS.length] }}>
                  {w}
                  <X size={10} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => toggleWord(w)} />
                </span>
              ))}
            </div>
            {mergedTimeseries.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={mergedTimeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: "#a1a1aa" }}
                  />
                  {selectedWords.map((w, i) => (
                    <Line key={w} type="monotone" dataKey={w} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-zinc-500 text-sm">No trend data available</div>
            )}
          </section>
        </div>

        {/* ── 4. Heatmap ────────────────────────────────────────────────────── */}
        {heatmapCreators.length > 0 && heatmapData.length > 0 && (
          <section className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Creator x Keyword Heatmap</h2>
            <div className="overflow-x-auto">
              <div className="inline-grid gap-px" style={{ gridTemplateColumns: `120px repeat(${heatmapKeywords.length}, 56px)` }}>
                {/* Header row */}
                <div />
                {heatmapKeywords.map((kw) => (
                  <div key={kw} className="text-[9px] text-zinc-500 text-center py-1 -rotate-45 origin-bottom-left h-12 flex items-end justify-center">
                    {kw}
                  </div>
                ))}
                {/* Data rows */}
                {heatmapCreators.map((creator, ri) => (
                  <>
                    <div key={`label-${creator}`} className="text-[11px] text-zinc-400 pr-3 flex items-center justify-end">{creator}</div>
                    {heatmapKeywords.map((kw, ci) => {
                      const val = heatmapData[ri]?.[ci] ?? 0;
                      const intensity = val / heatmapMax;
                      return (
                        <div
                          key={`${creator}-${kw}`}
                          className="w-14 h-8 rounded-sm flex items-center justify-center text-[9px] cursor-default relative group"
                          style={{ backgroundColor: `rgba(245, 158, 11, ${intensity * 0.8 + 0.05})` }}
                        >
                          <span className="opacity-0 group-hover:opacity-100 text-zinc-100 transition-opacity font-mono">{val}</span>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                            {creator} / {kw}: {val}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
