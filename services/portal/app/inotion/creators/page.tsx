"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users, Video, FileText, ArrowLeft, TrendingUp, ExternalLink, BarChart3, MessageSquare, Eye, Zap, Network } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import ThemeToggle from "../../components/inotion/ThemeToggle";
import GlobalSearch from "../../components/inotion/GlobalSearch";

// ─── Creator Types & Components ───────────────────────────────────────────────

interface Creator {
  id: string;
  name: string;
  platform: string;
  handle?: string;
  subscriber_count?: number;
  content_count?: number;
  transcript_count?: number;
  coverage_pct?: number;
  last_scraped_at?: string;
  url?: string;
  niche?: string;
  strategic_value?: "high" | "medium" | "low";
}

interface AnalyticsData {
  summary: {
    total_creators: number;
    total_content: number;
    total_transcripts: number;
    total_comments: number;
  };
  contentPerCreator: { name: string; platform: string; count: number; subscriber_count: number }[];
  contentOverTime: { name: string; month: string; count: number }[];
  engagement: { name: string; total_content: number; total_views: string; total_likes: string; total_comments: string }[];
  velocity: { name: string; week: string; count: number }[];
  topWords: { word: string; freq: number }[];
  creatorTopicOverlap: { word: string; creators: string[]; creator_count: number; total_freq: number }[];
}

function CoverageBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
        }`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    youtube: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
    twitter: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
    x: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
    podcast: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
    linkedin: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    instagram: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
    tiktok: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
    substack: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  };
  const p = platform?.toLowerCase() ?? "other";
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${colors[p] ?? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
      {platform}
    </span>
  );
}

function CreatorCard({ creator, isBoard }: { creator: Creator; isBoard: boolean }) {
  const coverage = creator.coverage_pct ?? (
    creator.content_count && creator.transcript_count
      ? Math.round((creator.transcript_count / creator.content_count) * 100)
      : 0
  );

  function fmtNum(n?: number): string {
    if (!n) return "—";
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  }

  function fmtDate(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    const ms = Date.now() - d.getTime();
    const h = Math.floor(ms / 3600000);
    if (h < 1) return "< 1h ago";
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div
      className={`bg-white dark:bg-zinc-900 rounded-xl border shadow-sm hover:shadow-md transition-all ${
        isBoard
          ? "border-amber-200 dark:border-amber-800/50 ring-1 ring-amber-200/50 dark:ring-amber-800/30"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isBoard && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wide">
                  Priority
                </span>
              )}
              {creator.strategic_value === "high" && !isBoard && (
                <TrendingUp size={10} className="text-emerald-500" />
              )}
            </div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{creator.name}</h3>
            {creator.handle && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">@{creator.handle}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <PlatformBadge platform={creator.platform} />
            {creator.url && (
              <a href={creator.url} target="_blank" rel="noopener noreferrer" className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors">
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{fmtNum(creator.subscriber_count)}</div>
            <div className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Subs</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{fmtNum(creator.content_count)}</div>
            <div className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Videos</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{fmtNum(creator.transcript_count)}</div>
            <div className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Transcripts</div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide font-medium">Coverage</span>
            <span className={`text-[10px] font-mono font-semibold ${
              coverage >= 80 ? "text-emerald-600 dark:text-emerald-400" :
              coverage >= 50 ? "text-amber-600 dark:text-amber-400" :
              "text-rose-600 dark:text-rose-400"
            }`}>{coverage}%</span>
          </div>
          <CoverageBar pct={coverage} />
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 dark:text-zinc-500">
          Scraped {fmtDate(creator.last_scraped_at)}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{title}</h3>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm">{message}</p>
    </div>
  );
}

// ─── Analytics Components ─────────────────────────────────────────────────────

const AMBER = "#f59e0b";
const CHART_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"];

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start gap-4">
      <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-zinc-100 tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</div>
        <div className="text-xs text-zinc-500 mt-0.5 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">{title}</h2>
      {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-zinc-300 font-medium mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-400">{p.name}:</span>
          <span className="text-zinc-100 font-medium">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Analytics Tab Content ────────────────────────────────────────────────────

function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/creators/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.detail || d.error);
        else setData(d);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const contentBarData = useMemo(() => {
    if (!data) return [];
    return data.contentPerCreator.slice(0, 20).map((c) => ({
      name: c.name.length > 15 ? c.name.slice(0, 14) + "..." : c.name,
      fullName: c.name,
      count: c.count,
    }));
  }, [data]);

  const timelineData = useMemo(() => {
    if (!data) return [];
    const top5 = data.contentPerCreator.slice(0, 5).map((c) => c.name);
    const months = [...new Set(data.contentOverTime.map((r) => r.month))].sort();
    return months.map((m) => {
      const row: any = { month: m };
      for (const creator of top5) {
        const match = data.contentOverTime.find((r) => r.month === m && r.name === creator);
        row[creator] = match?.count || 0;
      }
      return row;
    });
  }, [data]);

  const top5Creators = useMemo(
    () => data?.contentPerCreator.slice(0, 5).map((c) => c.name) || [],
    [data]
  );

  const engagementData = useMemo(() => {
    if (!data) return [];
    return data.engagement.slice(0, 15).map((e) => ({
      name: e.name.length > 15 ? e.name.slice(0, 14) + "..." : e.name,
      fullName: e.name,
      views: Number(e.total_views),
      likes: Number(e.total_likes),
      comments: Number(e.total_comments),
    }));
  }, [data]);

  const velocityData = useMemo(() => {
    if (!data) return [];
    const weekMap = new Map<string, number>();
    for (const v of data.velocity) {
      weekMap.set(v.week, (weekMap.get(v.week) || 0) + v.count);
    }
    return [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week: week.slice(5), count }));
  }, [data]);

  const wordCloudData = useMemo(() => {
    if (!data) return [];
    return data.topWords.slice(0, 30).map((w, i) => ({
      name: w.word,
      size: w.freq,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [data]);

  const overlapData = useMemo(() => {
    if (!data) return [];
    return data.creatorTopicOverlap.slice(0, 20);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-amber-500">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-zinc-900 border border-red-800 rounded-xl p-6 max-w-md">
          <h2 className="text-sm font-semibold text-red-400 mb-2">Analytics Error</h2>
          <p className="text-xs text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-10">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<BarChart3 size={18} />} label="Creators Tracked" value={data.summary.total_creators} />
        <StatCard icon={<TrendingUp size={18} />} label="Total Content" value={data.summary.total_content} />
        <StatCard icon={<MessageSquare size={18} />} label="Transcripts" value={data.summary.total_transcripts} />
        <StatCard icon={<Eye size={18} />} label="Comments Scraped" value={data.summary.total_comments} />
      </div>

      {/* Content Per Creator */}
      <section>
        <SectionHeader title="Content Per Creator" subtitle="Total videos/posts scraped per creator" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={contentBarData} margin={{ top: 5, right: 20, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fill: "#71717a", fontSize: 10 }} interval={0} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill={AMBER} radius={[4, 4, 0, 0]} name="Content" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Content Timeline */}
      <section>
        <SectionHeader title="Content Timeline" subtitle="Monthly output — top 5 creators" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={timelineData} margin={{ top: 5, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 10 }} interval={2} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              {top5Creators.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[i]} strokeWidth={2} dot={false} name={name} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 mt-3 justify-center">
            {top5Creators.map((name, i) => (
              <div key={name} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engagement Metrics */}
      <section>
        <SectionHeader title="Engagement Metrics" subtitle="Aggregated views, likes, and comments per creator" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={engagementData} margin={{ top: 5, right: 20, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" tick={{ fill: "#71717a", fontSize: 10 }} interval={0} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Views" />
              <Bar dataKey="likes" fill="#10b981" radius={[4, 4, 0, 0]} name="Likes" />
              <Bar dataKey="comments" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Comments" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Content Velocity */}
      <section>
        <SectionHeader title="Content Velocity" subtitle="Total posts per week — last 12 weeks" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={velocityData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="week" tick={{ fill: "#71717a", fontSize: 10 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke={AMBER} fill={AMBER} fillOpacity={0.15} strokeWidth={2} name="Posts" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top Topics */}
      <section>
        <SectionHeader title="Top Topics" subtitle="Most frequent terms across all transcripts" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex flex-wrap gap-2">
            {wordCloudData.map((w) => {
              const maxFreq = wordCloudData[0]?.size || 1;
              const scale = 0.6 + (w.size / maxFreq) * 0.4;
              return (
                <span
                  key={w.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-800/50 transition-colors hover:border-amber-700"
                  style={{ opacity: 0.5 + (w.size / maxFreq) * 0.5 }}
                >
                  <span className="text-amber-500 font-semibold" style={{ fontSize: `${Math.max(11, scale * 16)}px` }}>
                    {w.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 tabular-nums">{w.size.toLocaleString()}</span>
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cross-Creator Topic Overlap */}
      <section>
        <SectionHeader title="Cross-Creator Topic Overlap" subtitle="Topics shared between multiple creators" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-5 py-3 text-zinc-500 uppercase tracking-wider font-medium">Topic</th>
                <th className="text-left px-5 py-3 text-zinc-500 uppercase tracking-wider font-medium">Creators</th>
                <th className="text-right px-5 py-3 text-zinc-500 uppercase tracking-wider font-medium">Shared By</th>
                <th className="text-right px-5 py-3 text-zinc-500 uppercase tracking-wider font-medium">Total Mentions</th>
              </tr>
            </thead>
            <tbody>
              {overlapData.map((row, i) => (
                <tr key={row.word} className={`border-b border-zinc-800/50 ${i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-900/50"}`}>
                  <td className="px-5 py-3 font-medium text-amber-500">{row.word}</td>
                  <td className="px-5 py-3 text-zinc-400">
                    <div className="flex flex-wrap gap-1">
                      {row.creators.map((c) => (
                        <span key={c} className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-300 tabular-nums">{row.creator_count}</td>
                  <td className="px-5 py-3 text-right text-zinc-300 tabular-nums">{row.total_freq.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorsPage() {
  const [activeTab, setActiveTab] = useState<"creators" | "analytics">("creators");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [boardNames, setBoardNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "subscribers" | "transcripts" | "coverage">("subscribers");

  useEffect(() => {
    async function loadData() {
      const [creatorsRes, boardRes] = await Promise.allSettled([
        fetch("/api/creators"),
        fetch("/api/v1/board/members"),
      ]);

      if (creatorsRes.status === "fulfilled" && creatorsRes.value.ok) {
        const data = await creatorsRes.value.json();
        setCreators(data.creators ?? []);
      }

      if (boardRes.status === "fulfilled" && boardRes.value.ok) {
        const data = await boardRes.value.json();
        const names = (data.members ?? []).map((m: { name: string }) => m.name);
        setBoardNames(names);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  const platforms = useMemo(() => {
    const all = new Set(creators.map((c) => c.platform?.toLowerCase()).filter(Boolean));
    return ["all", ...Array.from(all).sort()];
  }, [creators]);

  const filteredCreators = useMemo(() => {
    let list = [...creators];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.handle?.toLowerCase().includes(q)
      );
    }

    if (platformFilter !== "all") {
      list = list.filter((c) => c.platform?.toLowerCase() === platformFilter);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "subscribers": return (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0);
        case "transcripts": return (b.transcript_count ?? 0) - (a.transcript_count ?? 0);
        case "coverage": {
          const ca = a.coverage_pct ?? (a.content_count && a.transcript_count ? Math.round((a.transcript_count / a.content_count) * 100) : 0);
          const cb = b.coverage_pct ?? (b.content_count && b.transcript_count ? Math.round((b.transcript_count / b.content_count) * 100) : 0);
          return cb - ca;
        }
        default: return 0;
      }
    });

    return list;
  }, [creators, search, platformFilter, sortBy]);

  const boardCreators = filteredCreators.filter((c) => boardNames.includes(c.name));
  const regularCreators = filteredCreators.filter((c) => !boardNames.includes(c.name));

  const tabs = [
    { id: "creators" as const, label: "Creators" },
    { id: "analytics" as const, label: "Analytics" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/inotion" className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} />
              Dashboard
            </Link>
            <span className="text-zinc-200 dark:text-zinc-700">/</span>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Creator Intelligence</h1>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">

        {/* Tab Bar */}
        <div className="flex items-center gap-1 bg-zinc-950 rounded-lg p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-amber-500 text-zinc-950"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Creators Tab */}
        {activeTab === "creators" && (
          <>
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Creators</h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {loading ? "Loading..." : `${creators.length} creators tracked`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter by name..."
                    className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 w-40"
                  />
                </div>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 capitalize"
                >
                  {platforms.map((p) => (
                    <option key={p} value={p} className="capitalize">{p === "all" ? "All Platforms" : p}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-xs px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                >
                  <option value="subscribers">Sort: Subscribers</option>
                  <option value="transcripts">Sort: Transcripts</option>
                  <option value="coverage">Sort: Coverage</option>
                  <option value="name">Sort: Name</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                ))}
              </div>
            ) : creators.length === 0 ? (
              <EmptyState
                icon={<Users size={24} className="text-zinc-300 dark:text-zinc-600" />}
                title="No creators found"
                message="The content intelligence service returned no creators. Check that raiser-content-intel is running."
              />
            ) : (
              <>
                {boardCreators.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                        Priority Creators
                      </h2>
                      <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {boardCreators.map((creator) => (
                        <CreatorCard key={creator.id} creator={creator} isBoard={true} />
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  {boardCreators.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                        All Creators ({regularCreators.length})
                      </h2>
                      <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                  )}
                  {filteredCreators.length === 0 ? (
                    <EmptyState
                      icon={<Search size={20} className="text-zinc-300 dark:text-zinc-600" />}
                      title="No results"
                      message={`No creators match "${search}"`}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {(boardCreators.length > 0 ? regularCreators : filteredCreators).map((creator) => (
                        <CreatorCard key={creator.id} creator={creator} isBoard={false} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && <AnalyticsTab />}
      </main>
    </div>
  );
}
