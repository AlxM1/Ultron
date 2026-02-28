"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Filter, FileText, Loader2 } from "lucide-react";
import ThemeToggle from "../../../components/inotion/ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_COMMENTS_API || "/api/comments";

interface QuestionGroup {
  theme: string;
  count: number;
  samples: string[];
  creators: string[];
}

export default function OpportunitiesPage() {
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<string>("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/questions`)
      .then(r => r.json())
      .then(d => { if (!d.error && d.questions) setGroups(d.questions); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const creatorList = [...new Set(groups.flatMap(g => g.creators))].sort();

  const filtered = selectedCreator
    ? groups.filter(g => g.creators.some(c => c.toLowerCase().includes(selectedCreator.toLowerCase())))
    : groups;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm font-medium">Loading opportunities...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/inotion/comments" className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} />
              Comments
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <h1 className="text-sm font-semibold text-amber-600 dark:text-amber-500">Content Opportunities</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-zinc-400 dark:text-zinc-500" />
            <select
              value={selectedCreator}
              onChange={e => setSelectedCreator(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-amber-600"
            >
              <option value="">All Creators</option>
              {creatorList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="text-xs text-zinc-400 dark:text-zinc-500">{filtered.length} themes found</div>
        </div>

        {/* Question Groups */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((group, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
                <button
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-500 tabular-nums w-16">{group.count.toLocaleString()}</div>
                    <div>
                      <div className="text-sm text-zinc-900 dark:text-zinc-200 font-medium">{group.theme}</div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {group.creators.length} creators&apos; audiences asking
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {group.creators.slice(0, 3).map(c => (
                        <span key={c} className="inline-block px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] border border-zinc-200 dark:border-zinc-700">
                          {c}
                        </span>
                      ))}
                      {group.creators.length > 3 && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-[10px] border border-zinc-200 dark:border-zinc-700">
                          +{group.creators.length - 3}
                        </span>
                      )}
                    </div>
                    <svg className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform ${expandedIdx === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedIdx === i && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 px-5 py-4 space-y-3">
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Sample Comments</div>
                    <div className="space-y-2">
                      {group.samples.map((s, si) => (
                        <div key={si} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <span className="text-zinc-300 dark:text-zinc-600 mt-0.5">--</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Audiences</div>
                      <div className="flex flex-wrap gap-1">
                        {group.creators.map(c => (
                          <span key={c} className="inline-block px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 text-[10px] border border-cyan-200 dark:border-cyan-500/20">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2">
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors flex items-center gap-1.5">
                        <FileText size={12} />
                        Use for Script
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">No data available</div>
        )}
      </main>
    </div>
  );
}
