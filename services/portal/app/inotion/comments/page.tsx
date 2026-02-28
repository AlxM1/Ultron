"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, MessageSquare, TrendingUp, TrendingDown, HelpCircle, Flame,
  AlertTriangle, Loader2, Search, X, Tag, Youtube,
} from "lucide-react";

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
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Treemap,
} from "recharts";
import ThemeToggle from "../../components/inotion/ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_COMMENTS_API || "/api/comments";
const AMBER = "#f59e0b";
const CYAN = "#06b6d4";

type Tab = "overview" | "trending" | "keywords" | "compare";

// ─── Shared Components ────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent = "amber" }: { icon: React.ReactNode; label: string; value: string; accent?: "amber" | "cyan" }) {
  const colors = accent === "cyan"
    ? { bg: "bg-cyan-500/10", text: "text-cyan-500" }
    : { bg: "bg-amber-500/10", text: "text-amber-500" };
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex items-start gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
      <div className={`p-2.5 ${colors.bg} rounded-lg ${colors.text}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</div>
        <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 uppercase tracking-widest">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-zinc-700 dark:text-zinc-300 font-medium mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-500 dark:text-zinc-400">{p.name}:</span>
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">
            {typeof p.value === "number" ? (p.value < 1 && p.value > 0 ? (p.value * 100).toFixed(1) + "%" : p.value.toLocaleString()) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Keywords helpers ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  ai: "#f59e0b", tools: "#06b6d4", business: "#22c55e", crypto: "#a855f7", uncategorized: "#71717a",
};
const LINE_COLORS = ["#f59e0b", "#06b6d4", "#22c55e", "#a855f7", "#ef4444", "#ec4899", "#3b82f6", "#14b8a6"];
const COMPARE_COLORS = ["#f59e0b", "#06b6d4", "#8b5cf6", "#22c55e", "#ef4444"];

interface Keyword { word: string; count: number; sentiment: { positive: number; negative: number; neutral: number }; trend_pct: number; category: string; }
interface TimeseriesEntry { word: string; data: { date: string; count: number }[]; }
interface TrendingTopic { topic: string; direction: "rising" | "falling"; growth: number; mentions: number; samples: string[]; }
interface CompareData { creator: string; positive: number; negative: number; neutral: number; avgLikes: number; avgComments: number; totalComments: number; }

function TreemapContent(props: any) {
  const { x, y, width, height, word, count, fill } = props;
  if (width < 40 || height < 24) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#18181b" strokeWidth={2} rx={4} />
      {width > 60 && height > 36 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fafafa" fontSize={width > 100 ? 13 : 10} fontWeight={600}>{word}</text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#a1a1aa" fontSize={9}>{count?.toLocaleString()}</text>
        </>
      )}
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═════════════════════════════════════════════════════════════════════════════

function OverviewTab({ sentimentData, questions, painPoints, stats }: {
  sentimentData: any[]; questions: any[]; painPoints: any[]; stats: any;
}) {
  return (
    <div className="space-y-10">
      {/* Hero Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<MessageSquare size={18} />} label="Total Comments Analyzed" value={stats?.totalComments?.toLocaleString() || "--"} />
        <StatCard icon={<TrendingUp size={18} />} label="Avg Sentiment" value={stats?.avgSentiment || "--"} accent="cyan" />
        <StatCard icon={<HelpCircle size={18} />} label="Questions Found" value={stats?.questionsFound?.toLocaleString() || "--"} />
        <StatCard icon={<Flame size={18} />} label="Trending Topics" value={stats?.trendingTopics || "--"} accent="cyan" />
      </div>

      {/* Sentiment Trend Chart */}
      <section>
        <SectionHeader title="Sentiment Trend" subtitle="30-day rolling sentiment across all tracked creators" />
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
          {sentimentData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sentimentData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="positive" stroke="#22c55e" strokeWidth={2} dot={false} name="Positive" />
                  <Line type="monotone" dataKey="neutral" stroke={AMBER} strokeWidth={2} dot={false} name="Neutral" />
                  <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Negative" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-3 justify-center">
                {[{ label: "Positive", color: "#22c55e" }, { label: "Neutral", color: AMBER }, { label: "Negative", color: "#ef4444" }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-zinc-400 dark:text-zinc-500 text-sm">No sentiment data available</div>
          )}
        </div>
      </section>

      {/* Two Column: Questions + Pain Points */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <SectionHeader
            title="Top Content Opportunities"
            subtitle="Questions audiences keep asking"
            action={<Link href="/inotion/comments/opportunities" className="text-xs text-cyan-600 dark:text-cyan-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">View All</Link>}
          />
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
            {questions.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">#</th>
                    <th className="text-left px-4 py-3 text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Question Theme</th>
                    <th className="text-right px-4 py-3 text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Frequency</th>
                    <th className="text-right px-4 py-3 text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Creators</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q: any, i: number) => (
                    <tr key={i} className={`border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-zinc-50/50 dark:bg-zinc-900/50"}`}>
                      <td className="px-4 py-2.5 text-zinc-400 dark:text-zinc-600 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2.5 text-zinc-900 dark:text-zinc-200">{q.theme}</td>
                      <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-500 font-medium tabular-nums">{q.count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">{q.creators}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center py-12 text-zinc-400 dark:text-zinc-500 text-sm">No question data available</div>
            )}
          </div>
        </section>

        <section>
          <SectionHeader title="Pain Point Radar" subtitle="Top audience frustrations by intensity" />
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
            {painPoints.length > 0 ? (
              <div className="space-y-4">
                {painPoints.map((pp: any, i: number) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={12} className={pp.intensity > 80 ? "text-red-500 dark:text-red-400" : pp.intensity > 60 ? "text-amber-500 dark:text-amber-400" : "text-zinc-400 dark:text-zinc-500"} />
                        <span className="text-xs text-zinc-900 dark:text-zinc-200">{pp.topic}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">{pp.mentions.toLocaleString()} mentions</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{
                        width: `${pp.intensity}%`,
                        background: pp.intensity > 80 ? "linear-gradient(to right, #ef4444, #dc2626)" : pp.intensity > 60 ? `linear-gradient(to right, ${AMBER}, #d97706)` : `linear-gradient(to right, ${CYAN}, #0891b2)`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-zinc-400 dark:text-zinc-500 text-sm">No pain point data available</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TRENDING TAB
// ═════════════════════════════════════════════════════════════════════════════

function TrendingTab() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "rising" | "falling">("all");

  useEffect(() => {
    fetch(`${API_BASE}/trending`)
      .then(r => r.json())
      .then(d => { if (!d.error && d.topics) setTopics(d.topics); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? topics : topics.filter(t => t.direction === filter);
  const rising = topics.filter(t => t.direction === "rising").sort((a, b) => b.growth - a.growth);
  const falling = topics.filter(t => t.direction === "falling").sort((a, b) => a.growth - b.growth);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        {(["all", "rising", "falling"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
              filter === f
                ? f === "rising" ? "bg-green-50 dark:bg-green-500/15 border-green-300 dark:border-green-500/40 text-green-700 dark:text-green-400"
                  : f === "falling" ? "bg-red-50 dark:bg-red-500/15 border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-400"
                  : "bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400"
                : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
            }`}
          >
            {f} {f === "all" ? `(${topics.length})` : f === "rising" ? `(${rising.length})` : `(${falling.length})`}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((topic, i) => (
            <div key={topic.topic} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
              <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)} className="w-full px-5 py-4 flex items-center justify-between text-left">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${topic.direction === "rising" ? "bg-green-50 dark:bg-green-500/10" : "bg-red-50 dark:bg-red-500/10"}`}>
                    {topic.direction === "rising" ? <TrendingUp size={16} className="text-green-700 dark:text-green-400" /> : <TrendingDown size={16} className="text-red-700 dark:text-red-400" />}
                  </div>
                  <div>
                    <div className="text-sm text-zinc-900 dark:text-zinc-200 font-medium">{topic.topic}</div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 tabular-nums">{topic.mentions.toLocaleString()} mentions</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold tabular-nums ${topic.direction === "rising" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                    {topic.growth > 0 ? "+" : ""}{topic.growth}%
                  </span>
                  <svg className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform ${expandedIdx === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedIdx === i && (
                <div className="border-t border-zinc-200 dark:border-zinc-800 px-5 py-4 space-y-2">
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Sample Comments</div>
                  {topic.samples.map((s, si) => (
                    <div key={si} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">--</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">No trending data available</div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// KEYWORDS TAB
// ═════════════════════════════════════════════════════════════════════════════

function KeywordsTab() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesEntry[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [heatmapCreators, setHeatmapCreators] = useState<string[]>([]);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/keywords?days=30&limit=100`);
        if (!res.ok) throw new Error("api");
        const data: Keyword[] = await res.json();
        setKeywords(data);
      } catch { setKeywords([]); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (keywords.length && selectedWords.length === 0) {
      const top5 = [...keywords].sort((a, b) => b.trend_pct - a.trend_pct).slice(0, 5).map(k => k.word);
      setSelectedWords(top5);
    }
  }, [keywords]);

  useEffect(() => {
    if (!selectedWords.length) { setTimeseries([]); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/keywords/timeseries?keywords=${selectedWords.join(",")}&days=90&interval=week`);
        if (!res.ok) throw new Error("api");
        const data = await res.json();
        setTimeseries(data.keywords || []);
      } catch { setTimeseries([]); }
    })();
  }, [selectedWords]);

  useEffect(() => {
    if (keywords.length === 0) return;
    const hkw = keywords.slice(0, 20).map(k => k.word);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/keywords/heatmap?keywords=${hkw.join(",")}`);
        if (!res.ok) throw new Error("api");
        const data = await res.json();
        setHeatmapCreators(data.creators || []);
        setHeatmapData(data.matrix || []);
      } catch { setHeatmapCreators([]); setHeatmapData([]); }
    })();
  }, [keywords]);

  const toggleWord = useCallback((word: string) => {
    setSelectedWords(prev => prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]);
  }, []);

  const addFromSearch = useCallback(() => {
    const w = searchInput.trim().toLowerCase();
    if (w && !selectedWords.includes(w)) setSelectedWords(prev => [...prev, w]);
    setSearchInput("");
  }, [searchInput, selectedWords]);

  const bubbles = useMemo(() => keywords.slice(0, 80), [keywords]);
  const maxCount = useMemo(() => Math.max(...bubbles.map(k => k.count), 1), [bubbles]);

  const treemapData = useMemo(() => {
    return keywords.slice(0, 50).map(k => {
      const base = CATEGORY_COLORS[k.category] || CATEGORY_COLORS.uncategorized;
      const brightness = 0.4 + k.sentiment.positive * 0.6;
      return { word: k.word, count: k.count, fill: base + Math.round(brightness * 255).toString(16).padStart(2, "0") };
    });
  }, [keywords]);

  const mergedTimeseries = useMemo(() => {
    if (!timeseries.length) return [];
    const dateMap: Record<string, Record<string, number>> = {};
    timeseries.forEach(ts => { ts.data.forEach(d => { if (!dateMap[d.date]) dateMap[d.date] = {}; dateMap[d.date][ts.word] = d.count; }); });
    return Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, vals]) => ({ date: date.slice(5), ...vals }));
  }, [timeseries]);

  const heatmapKeywords = useMemo(() => keywords.slice(0, 20).map(k => k.word), [keywords]);
  const heatmapMax = useMemo(() => Math.max(...heatmapData.flat(), 1), [heatmapData]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-amber-500" /></div>;
  }

  if (keywords.length === 0) {
    return <div className="flex items-center justify-center h-[60vh] text-zinc-400 dark:text-zinc-500 text-sm">No keyword data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Bubble Map */}
      <section className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2"><Tag size={14} className="text-amber-500" /> Keyword Bubble Map</h2>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600">Click to track in trends</span>
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
                  <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={isSelected ? 0.9 : 0.35} stroke={isSelected ? "#fafafa" : color} strokeWidth={isSelected ? 2 : 0.5} strokeOpacity={0.5} />
                  {r > 18 && <text x={cx} y={cy + 1} textAnchor="middle" fill="#fafafa" fontSize={r > 35 ? 12 : r > 25 ? 10 : 8} fontWeight={500} pointerEvents="none">{k.word}</text>}
                  <title>{`${k.word}: ${k.count.toLocaleString()} mentions\nPositive: ${(k.sentiment.positive * 100).toFixed(0)}% | Negative: ${(k.sentiment.negative * 100).toFixed(0)}% | Neutral: ${(k.sentiment.neutral * 100).toFixed(0)}%\nTrend: ${k.trend_pct > 0 ? "+" : ""}${k.trend_pct}%`}</title>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex gap-4 mt-3 justify-center">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} /> {cat}
            </div>
          ))}
        </div>
      </section>

      {/* Treemap + Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Keyword Treemap</h2>
          <ResponsiveContainer width="100%" height={360}>
            <Treemap data={treemapData} dataKey="count" nameKey="word" content={<TreemapContent />} isAnimationActive={false} />
          </ResponsiveContainer>
        </section>

        <section className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Keyword Trends</h2>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600" />
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addFromSearch()} placeholder="Add keyword..." className="w-full pl-7 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedWords.map((w, i) => (
              <span key={w} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor: LINE_COLORS[i % LINE_COLORS.length], color: LINE_COLORS[i % LINE_COLORS.length] }}>
                {w} <X size={10} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => toggleWord(w)} />
              </span>
            ))}
          </div>
          {mergedTimeseries.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={mergedTimeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#a1a1aa" }} />
                {selectedWords.map((w, i) => (
                  <Line key={w} type="monotone" dataKey={w} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-zinc-400 dark:text-zinc-500 text-sm">No trend data available</div>
          )}
        </section>
      </div>

      {/* Heatmap */}
      {heatmapCreators.length > 0 && heatmapData.length > 0 && (
        <section className="bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Creator x Keyword Heatmap</h2>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-px" style={{ gridTemplateColumns: `120px repeat(${heatmapKeywords.length}, 56px)` }}>
              <div />
              {heatmapKeywords.map(kw => (
                <div key={kw} className="text-[9px] text-zinc-400 dark:text-zinc-500 text-center py-1 -rotate-45 origin-bottom-left h-12 flex items-end justify-center">{kw}</div>
              ))}
              {heatmapCreators.map((creator, ri) => (
                <>{/* eslint-disable-next-line react/jsx-key */}
                  <div key={`label-${creator}`} className="text-[11px] text-zinc-600 dark:text-zinc-400 pr-3 flex items-center justify-end">{creator}</div>
                  {heatmapKeywords.map((kw, ci) => {
                    const val = heatmapData[ri]?.[ci] ?? 0;
                    const intensity = val / heatmapMax;
                    return (
                      <div key={`${creator}-${kw}`} className="w-14 h-8 rounded-sm flex items-center justify-center text-[9px] cursor-default relative group" style={{ backgroundColor: `rgba(245, 158, 11, ${intensity * 0.8 + 0.05})` }}>
                        <span className="opacity-0 group-hover:opacity-100 text-zinc-900 dark:text-zinc-100 transition-opacity font-mono">{val}</span>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg dark:shadow-none">{creator} / {kw}: {val}</div>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPARE TAB
// ═════════════════════════════════════════════════════════════════════════════

function CompareTab() {
  const [creatorOptions, setCreatorOptions] = useState<string[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState<CompareData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/creators");
        if (!res.ok) throw new Error("api");
        const data = await res.json();
        const names = Array.isArray(data) ? data.map((c: any) => c.name || c.channel_name || c) : [];
        setCreatorOptions(names);
      } catch { setCreatorOptions([]); }
      finally { setLoadingCreators(false); }
    })();
  }, []);

  function toggleCreator(name: string) {
    setSelected(prev => prev.includes(name) ? prev.filter(c => c !== name) : prev.length < 5 ? [...prev, name] : prev);
  }

  async function runComparison() {
    if (selected.length < 2) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`${API_BASE}/compare?creators=${selected.join(",")}&topic=${encodeURIComponent(topic)}`);
      const data = await res.json();
      if (!data.error && data.results) setResults(data.results);
      else setResults([]);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }

  const sentimentData = results.map(r => ({
    name: r.creator.length > 12 ? r.creator.slice(0, 11) + "..." : r.creator,
    Positive: r.positive, Negative: r.negative, Neutral: r.neutral,
  }));

  const engagementData = results.map(r => ({
    name: r.creator.length > 12 ? r.creator.slice(0, 11) + "..." : r.creator,
    "Avg Likes": r.avgLikes, "Avg Comments": r.avgComments,
  }));

  return (
    <div className="space-y-8">
      {/* Selection Controls */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm dark:shadow-none">
        <div>
          <div className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium mb-3">Select 2-5 Creators</div>
          {loadingCreators ? (
            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs py-2"><Loader2 size={14} className="animate-spin" /> Loading creators...</div>
          ) : creatorOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {creatorOptions.map(name => (
                <button key={name} onClick={() => toggleCreator(name)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${selected.includes(name) ? "bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"}`}
                >{name}</button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-400 dark:text-zinc-500 py-2">No creators available</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic keyword (optional)" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-amber-600" />
          </div>
          <button onClick={runComparison} disabled={selected.length < 2 || loading} className="text-xs px-4 py-2 rounded-lg bg-amber-500 text-white dark:text-zinc-950 font-medium hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            {loading ? "Analyzing..." : "Compare"}
          </button>
        </div>
        {selected.length > 0 && selected.length < 2 && <div className="text-[10px] text-zinc-400 dark:text-zinc-500">Select at least 2 creators to compare</div>}
      </div>

      {hasSearched && results.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {results.map((r, i) => (
              <div key={r.creator} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm dark:shadow-none" style={{ borderTopColor: COMPARE_COLORS[i], borderTopWidth: 2 }}>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{r.creator}</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 tabular-nums">{r.totalComments.toLocaleString()}</div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wide">Total Comments</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${r.positive}%` }} />
                  <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${r.neutral}%` }} />
                  <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${r.negative}%` }} />
                </div>
              </div>
            ))}
          </div>

          <section>
            <SectionHeader title="Sentiment Breakdown" subtitle="Percentage of comments by sentiment category" />
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sentimentData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Positive" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Neutral" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Negative" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <SectionHeader title="Engagement Comparison" subtitle="Average likes and comments per video" />
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={engagementData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Avg Likes" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Avg Comments" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}

      {hasSearched && !loading && results.length === 0 && (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">No comparison data available</div>
      )}
      {!hasSearched && (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-600 text-sm">Select creators and click Compare to see side-by-side analysis</div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "trending", label: "Trending" },
  { key: "keywords", label: "Keywords" },
  { key: "compare", label: "Compare" },
];

export default function CommentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sentimentData, setSentimentData] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [painPoints, setPainPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sentRes, qRes, ppRes] = await Promise.allSettled([
          fetch(`${API_BASE}/sentiment`).then(r => r.json()),
          fetch(`${API_BASE}/questions`).then(r => r.json()),
          fetch(`${API_BASE}/pain-points`).then(r => r.json()),
        ]);
        if (sentRes.status === "fulfilled" && !sentRes.value.error) {
          setSentimentData(sentRes.value.trend || []);
          if (sentRes.value.stats) setStats(sentRes.value.stats);
        }
        if (qRes.status === "fulfilled" && !qRes.value.error) setQuestions(qRes.value.questions?.slice(0, 10) || []);
        if (ppRes.status === "fulfilled" && !ppRes.value.error) setPainPoints(ppRes.value.painPoints || []);
      } catch {} finally { setLoading(false); }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm font-medium">Loading comment intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/inotion" className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} />
              INotion
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <h1 className="text-sm font-semibold text-amber-600 dark:text-amber-500">Comment Intelligence</h1>
            <div className="flex items-center gap-1.5 ml-3">
              <PlatformIcon platform="youtube" size={12} />
              <PlatformIcon platform="reddit" size={12} />
              <PlatformIcon platform="x" size={12} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/inotion/comments/opportunities" className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700">
              Opportunities
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="bg-white/80 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6">
          <nav className="flex gap-0">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-xs font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-zinc-400 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-screen-2xl mx-auto px-6 py-8">
        {activeTab === "overview" && (
          <OverviewTab sentimentData={sentimentData} questions={questions} painPoints={painPoints} stats={stats} />
        )}
        {activeTab === "trending" && <TrendingTab />}
        {activeTab === "keywords" && <KeywordsTab />}
        {activeTab === "compare" && <CompareTab />}
      </main>
    </div>
  );
}
