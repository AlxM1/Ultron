"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, TrendingUp, TrendingDown, Minus, Clock, Target, CheckCircle, AlertTriangle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DIMENSION_LABELS, DIMENSION_COLORS } from "../../_lib/constants";

interface DimensionData {
  score: number;
  issues: string[];
}

interface Audit {
  id: string;
  url: string;
  overall_score: number;
  dimensions: Record<string, DimensionData>;
  recommendations: string[];
  completed_at: string;
}

interface TrendData {
  domain: string;
  dataPoints: Array<{
    date: string;
    overall_score: number;
    dimensions: Record<string, number>;
  }>;
  change: { overall: number; dimensions: Record<string, number> } | null;
  issuesDelta: { fixed: number; new: number; fixedList: string[]; newList: string[] } | null;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function ChangeIndicator({ value, label }: { value: number; label?: string }) {
  const color = value > 0 ? "#22c55e" : value < 0 ? "#ef4444" : undefined;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={14} style={{ color: color }} className={!color ? "text-zinc-400 dark:text-white/40" : ""} />
      <span style={{ color: color }} className={`font-semibold font-mono text-[13px] ${!color ? "text-zinc-400 dark:text-white/40" : ""}`}>
        {value > 0 ? "+" : ""}{value}
      </span>
      {label && <span className="text-zinc-400 dark:text-white/40 text-[11px]">{label}</span>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[rgba(15,15,20,0.95)] border border-zinc-200 dark:border-amber-500/20 shadow-lg dark:shadow-none rounded-lg p-3 text-xs">
      <div className="text-zinc-400 dark:text-white/50 mb-2 text-[11px]">
        {new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-500 dark:text-white/60">{p.name}:</span>
          <span style={{ color: p.color }} className="font-semibold font-mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditHistoryPage() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  const loadHistory = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setError(null);
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    try {
      const [histRes, trendRes] = await Promise.all([
        fetch(`/api/seoh/audit/history/${encodeURIComponent(d)}`),
        fetch(`/api/seoh/audit/trends/${encodeURIComponent(d)}`),
      ]);
      if (!histRes.ok || !trendRes.ok) throw new Error("Failed to fetch data");
      const histData = await histRes.json();
      const trendData = await trendRes.json();
      setAudits(histData.audits);
      setTrends(trendData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const trackDomain = async () => {
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    setTracking(true);
    try {
      await fetch("/api/seoh/audit/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: d }),
      });
    } catch {} finally {
      setTracking(false);
    }
  };

  const chartData = trends?.dataPoints.map(dp => ({
    date: dp.date,
    "GEO Score": dp.overall_score,
    ...Object.entries(dp.dimensions).reduce((acc, [k, v]) => {
      acc[DIMENSION_LABELS[k] || k] = v;
      return acc;
    }, {} as Record<string, number>),
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-[#0a0a0f] dark:via-[#0d1117] dark:to-[#0a0f1a] text-zinc-900 dark:text-white px-6 py-10">
      <div className="max-w-[1000px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/inotion" className="text-amber-600 dark:text-amber-500/70 no-underline flex items-center">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold m-0 bg-gradient-to-br from-amber-500 to-amber-600 bg-clip-text text-transparent">
            Score History
          </h1>
          <span className="text-xs text-zinc-400 dark:text-white/30 font-mono">
            Track GEO scores over time
          </span>
        </div>

        {/* Input */}
        <div className="flex gap-3 mb-8 bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-amber-500/15 shadow-sm dark:shadow-none rounded-xl p-2">
          <input
            type="text" value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && loadHistory()}
            placeholder="Enter domain (e.g. seoh.ca)"
            className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-white text-[15px] px-4 py-2.5 font-mono placeholder:text-zinc-400 dark:placeholder:text-white/30"
          />
          <button onClick={loadHistory} disabled={loading || !domain.trim()} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg border-none font-semibold text-sm transition-all
            ${loading
              ? "bg-amber-100 dark:bg-amber-500/20 text-zinc-400 dark:text-white/50 cursor-wait"
              : "bg-gradient-to-br from-amber-500 to-amber-600 text-white dark:text-black cursor-pointer"
            }`}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? "Loading..." : "View History"}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {audits.length > 0 && trends && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
              {/* Latest score */}
              <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-amber-500/10 shadow-sm dark:shadow-none rounded-xl p-5">
                <div className="text-[11px] text-zinc-400 dark:text-white/40 uppercase tracking-wide mb-2">
                  Latest Score
                </div>
                <div className="flex items-baseline gap-3">
                  <span style={{ color: scoreColor(audits[0].overall_score) }} className="text-4xl font-bold font-mono">
                    {audits[0].overall_score}
                  </span>
                  {trends.change && <ChangeIndicator value={trends.change.overall} label="since last" />}
                </div>
              </div>

              {/* Total audits */}
              <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-amber-500/10 shadow-sm dark:shadow-none rounded-xl p-5">
                <div className="text-[11px] text-zinc-400 dark:text-white/40 uppercase tracking-wide mb-2">
                  Total Audits
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-amber-500 dark:text-amber-500/60" />
                  <span className="text-4xl font-bold text-amber-500 font-mono">
                    {audits.length}
                  </span>
                </div>
              </div>

              {/* Issues delta */}
              {trends.issuesDelta && (
                <>
                  <div className="bg-white dark:bg-white/[0.02] border border-emerald-200 dark:border-emerald-500/15 shadow-sm dark:shadow-none rounded-xl p-5">
                    <div className="text-[11px] text-zinc-400 dark:text-white/40 uppercase tracking-wide mb-2">
                      Issues Fixed
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-emerald-500" />
                      <span className="text-4xl font-bold text-emerald-500 font-mono">
                        {trends.issuesDelta.fixed}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-white/[0.02] border border-red-200 dark:border-red-500/15 shadow-sm dark:shadow-none rounded-xl p-5">
                    <div className="text-[11px] text-zinc-400 dark:text-white/40 uppercase tracking-wide mb-2">
                      New Issues
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={18} className="text-red-500" />
                      <span className="text-4xl font-bold text-red-500 font-mono">
                        {trends.issuesDelta.new}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Track button */}
            <div className="flex justify-end mb-6">
              <button onClick={trackDomain} disabled={tracking} className="px-5 py-2 rounded-lg border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 font-semibold text-[13px] cursor-pointer flex items-center gap-2 disabled:cursor-wait hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all">
                <Target size={14} />
                {tracking ? "Tracking..." : "Track for Weekly Re-Audit"}
              </button>
            </div>

            {/* Overall score chart */}
            <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-amber-500/10 shadow-sm dark:shadow-none rounded-2xl p-6 mb-6">
              <h3 className="text-base font-semibold mb-5 text-amber-600 dark:text-amber-500/90">
                GEO Score Over Time
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(161,161,170,0.2)" className="dark:[&>line]:stroke-white/[0.06]" />
                  <XAxis
                    dataKey="date" stroke="currentColor" className="text-zinc-400 dark:text-white/30" fontSize={11}
                    tickFormatter={v => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  />
                  <YAxis stroke="currentColor" className="text-zinc-400 dark:text-white/30" fontSize={11} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="GEO Score" stroke="#f59e0b" strokeWidth={3}
                    dot={{ fill: "#f59e0b", r: 4 }} activeDot={{ r: 6, fill: "#f59e0b" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Dimension trends chart */}
            <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-amber-500/10 shadow-sm dark:shadow-none rounded-2xl p-6 mb-6">
              <h3 className="text-base font-semibold mb-5 text-amber-600 dark:text-amber-500/90">
                Dimension Trends
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(161,161,170,0.2)" className="dark:[&>line]:stroke-white/[0.06]" />
                  <XAxis
                    dataKey="date" stroke="currentColor" className="text-zinc-400 dark:text-white/30" fontSize={11}
                    tickFormatter={v => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  />
                  <YAxis stroke="currentColor" className="text-zinc-400 dark:text-white/30" fontSize={11} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                    <Line
                      key={key} type="monotone" dataKey={label}
                      stroke={DIMENSION_COLORS[key]} strokeWidth={2}
                      dot={{ fill: DIMENSION_COLORS[key], r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Per-dimension change indicators */}
            {trends.change && (
              <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-amber-500/10 shadow-sm dark:shadow-none rounded-2xl p-6 mb-6">
                <h3 className="text-base font-semibold mb-4 text-amber-600 dark:text-amber-500/90">
                  Changes Since Last Audit
                </h3>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                  {Object.entries(trends.change.dimensions).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.06]">
                      <span className="text-xs text-zinc-600 dark:text-white/60">{DIMENSION_LABELS[key] || key}</span>
                      <ChangeIndicator value={val} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit list */}
            <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-amber-500/10 shadow-sm dark:shadow-none rounded-2xl p-6">
              <h3 className="text-base font-semibold mb-4 text-amber-600 dark:text-amber-500/90">
                All Audits
              </h3>
              {audits.map((audit, i) => (
                <Link
                  key={audit.id}
                  href={`/inotion/audit?prefill=${encodeURIComponent(audit.url)}`}
                  className="no-underline block"
                >
                  <div className={`flex justify-between items-center px-4 py-3.5 rounded-lg mb-1.5 cursor-pointer transition-all
                    ${i === 0
                      ? "bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/10"
                      : "bg-transparent border border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-amber-500/[0.08]"
                    }`}
                  >
                    <div>
                      <div className="text-[13px] text-zinc-700 dark:text-white/70 font-mono">
                        {new Date(audit.completed_at).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", year: "numeric",
                        })}
                        {i === 0 && (
                          <span className="ml-2.5 text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-500 font-semibold">
                            LATEST
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-white/30 mt-1">
                        {audit.url}
                      </div>
                    </div>
                    <span style={{ color: scoreColor(audit.overall_score) }} className="text-xl font-bold font-mono">
                      {audit.overall_score}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {!loading && audits.length === 0 && !error && (
          <div className="text-center py-16 text-zinc-400 dark:text-white/30 text-sm">
            Enter a domain to view its audit history and score trends.
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
