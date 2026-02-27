"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, TrendingUp, MessageSquare, Eye, ThumbsUp, Zap, Network } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Treemap, Cell,
  PieChart, Pie,
} from "recharts";
import ThemeToggle from "../../../components/inotion/ThemeToggle";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Theme ────────────────────────────────────────────────────────────────────

const AMBER = "#f59e0b";
const AMBER_DIM = "#92400e";
const AMBER_LIGHT = "#fbbf24";
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorAnalyticsPage() {
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

  // ── Derived data ──

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
    // Pivot: months as x-axis, top 5 creators as series
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
    // Aggregate total posts per week across all creators
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

  // ── Render ──

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-500">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="bg-zinc-900 border border-red-800 rounded-xl p-6 max-w-md">
          <h2 className="text-sm font-semibold text-red-400 mb-2">Analytics Error</h2>
          <p className="text-xs text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/inotion/creators"
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft size={12} />
              Creators
            </Link>
            <span className="text-zinc-700">/</span>
            <h1 className="text-sm font-semibold text-amber-500">Analytics</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<BarChart3 size={18} />} label="Creators Tracked" value={data.summary.total_creators} />
          <StatCard icon={<TrendingUp size={18} />} label="Total Content" value={data.summary.total_content} />
          <StatCard icon={<MessageSquare size={18} />} label="Transcripts" value={data.summary.total_transcripts} />
          <StatCard icon={<Eye size={18} />} label="Comments Scraped" value={data.summary.total_comments} />
        </div>

        {/* Content Per Creator (Bar Chart) */}
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

        {/* Content Over Time (Line Chart — Top 5) */}
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

        {/* Top Topics (Word Frequency) */}
        <section>
          <SectionHeader title="Top Topics" subtitle="Most frequent terms across all transcripts" />
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex flex-wrap gap-2">
              {wordCloudData.map((w, i) => {
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
      </main>
    </div>
  );
}
