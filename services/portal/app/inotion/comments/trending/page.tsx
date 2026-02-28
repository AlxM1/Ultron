"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import ThemeToggle from "../../../components/inotion/ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_COMMENTS_API || "/api/comments";

interface TrendingTopic {
  topic: string;
  direction: "rising" | "falling";
  growth: number;
  mentions: number;
  samples: string[];
}

export default function TrendingPage() {
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm font-medium">Loading trends...</span>
        </div>
      </div>
    );
  }

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
            <h1 className="text-sm font-semibold text-amber-500">Trending Topics</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {(["all", "rising", "falling"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                filter === f
                  ? f === "rising" ? "bg-green-500/15 border-green-500/40 text-green-400"
                    : f === "falling" ? "bg-red-500/15 border-red-500/40 text-red-400"
                    : "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {f} {f === "all" ? `(${topics.length})` : f === "rising" ? `(${rising.length})` : `(${falling.length})`}
            </button>
          ))}
        </div>

        {/* Topic List */}
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((topic, i) => (
              <div
                key={topic.topic}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
              >
                <button
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${topic.direction === "rising" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {topic.direction === "rising"
                        ? <TrendingUp size={16} className="text-green-400" />
                        : <TrendingDown size={16} className="text-red-400" />
                      }
                    </div>
                    <div>
                      <div className="text-sm text-zinc-200 font-medium">{topic.topic}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">
                        {topic.mentions.toLocaleString()} mentions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold tabular-nums ${
                      topic.direction === "rising" ? "text-green-400" : "text-red-400"
                    }`}>
                      {topic.growth > 0 ? "+" : ""}{topic.growth}%
                    </span>
                    <svg className={`w-4 h-4 text-zinc-500 transition-transform ${expandedIdx === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedIdx === i && (
                  <div className="border-t border-zinc-800 px-5 py-4 space-y-2">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Sample Comments</div>
                    {topic.samples.map((s, si) => (
                      <div key={si} className="flex items-start gap-2 text-xs text-zinc-400">
                        <span className="text-zinc-600 mt-0.5">--</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-zinc-500 text-sm">No trending data available</div>
        )}
      </main>
    </div>
  );
}
