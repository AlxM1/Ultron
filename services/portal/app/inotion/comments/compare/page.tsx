"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ThemeToggle from "../../../components/inotion/ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_COMMENTS_API || "/api/comments";
const COLORS = ["#f59e0b", "#06b6d4", "#8b5cf6", "#22c55e", "#ef4444"];

interface CompareData {
  creator: string;
  positive: number;
  negative: number;
  neutral: number;
  avgLikes: number;
  avgComments: number;
  totalComments: number;
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

export default function ComparePage() {
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
      } catch {
        setCreatorOptions([]);
      } finally {
        setLoadingCreators(false);
      }
    })();
  }, []);

  function toggleCreator(name: string) {
    setSelected(prev =>
      prev.includes(name)
        ? prev.filter(c => c !== name)
        : prev.length < 5 ? [...prev, name] : prev
    );
  }

  async function runComparison() {
    if (selected.length < 2) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`${API_BASE}/compare?creators=${selected.join(",")}&topic=${encodeURIComponent(topic)}`);
      const data = await res.json();
      if (!data.error && data.results) {
        setResults(data.results);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const sentimentData = results.map(r => ({
    name: r.creator.length > 12 ? r.creator.slice(0, 11) + "..." : r.creator,
    Positive: r.positive,
    Negative: r.negative,
    Neutral: r.neutral,
  }));

  const engagementData = results.map(r => ({
    name: r.creator.length > 12 ? r.creator.slice(0, 11) + "..." : r.creator,
    "Avg Likes": r.avgLikes,
    "Avg Comments": r.avgComments,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/inotion/comments" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} />
              Comments
            </Link>
            <span className="text-zinc-700">/</span>
            <h1 className="text-sm font-semibold text-amber-500">Creator Comparison</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">
        {/* Selection Controls */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3">Select 2-5 Creators</div>
            {loadingCreators ? (
              <div className="flex items-center gap-2 text-zinc-500 text-xs py-2">
                <Loader2 size={14} className="animate-spin" />
                Loading creators...
              </div>
            ) : creatorOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {creatorOptions.map(name => (
                  <button
                    key={name}
                    onClick={() => toggleCreator(name)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      selected.includes(name)
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-2">No creators available</div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Topic keyword (optional)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-600"
              />
            </div>
            <button
              onClick={runComparison}
              disabled={selected.length < 2 || loading}
              className="text-xs px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 font-medium hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Analyzing..." : "Compare"}
            </button>
          </div>
          {selected.length > 0 && selected.length < 2 && (
            <div className="text-[10px] text-zinc-500">Select at least 2 creators to compare</div>
          )}
        </div>

        {/* Results */}
        {hasSearched && results.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {results.map((r, i) => (
                <div key={r.creator} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4" style={{ borderTopColor: COLORS[i], borderTopWidth: 2 }}>
                  <div className="text-xs text-zinc-400 truncate">{r.creator}</div>
                  <div className="text-xl font-bold text-zinc-100 mt-1 tabular-nums">{r.totalComments.toLocaleString()}</div>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wide">Total Comments</div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${r.positive}%` }} />
                    <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${r.neutral}%` }} />
                    <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${r.negative}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Sentiment Comparison */}
            <section>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">Sentiment Breakdown</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Percentage of comments by sentiment category</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sentimentData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Positive" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Neutral" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Negative" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Engagement Comparison */}
            <section>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">Engagement Comparison</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Average likes and comments per video</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={engagementData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Avg Likes" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Avg Comments" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}

        {hasSearched && !loading && results.length === 0 && (
          <div className="text-center py-16 text-zinc-500 text-sm">No comparison data available</div>
        )}

        {!hasSearched && (
          <div className="text-center py-16 text-zinc-600 text-sm">
            Select creators and click Compare to see side-by-side analysis
          </div>
        )}
      </main>
    </div>
  );
}
