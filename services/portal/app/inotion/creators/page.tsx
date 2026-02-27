"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users, Video, FileText, ArrowLeft, TrendingUp, ExternalLink } from "lucide-react";
import ThemeToggle from "../../components/inotion/ThemeToggle";
import GlobalSearch from "../../components/inotion/GlobalSearch";

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

// Board of directors / priority creators (hardcoded top tier)
const BOARD_CREATORS = [
  "Alex Hormozi", "Naval Ravikant", "Sam Altman", "Lex Fridman", "Andrej Karpathy",
];

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
        {/* Header */}
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

        {/* Stats */}
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

        {/* Coverage */}
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

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 dark:text-zinc-500">
          Scraped {fmtDate(creator.last_scraped_at)}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "subscribers" | "transcripts" | "coverage">("subscribers");

  useEffect(() => {
    async function loadCreators() {
      try {
        const res = await fetch("/api/creators");
        if (res.ok) {
          const data = await res.json();
          setCreators(data.creators ?? []);
        }
      } catch {}
      setLoading(false);
    }
    loadCreators();
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

  const boardCreators = filteredCreators.filter((c) => BOARD_CREATORS.includes(c.name));
  const regularCreators = filteredCreators.filter((c) => !BOARD_CREATORS.includes(c.name));

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
            <span className="text-zinc-200 dark:text-zinc-700">/</span>
            <Link href="/inotion/creators/analytics" className="text-xs text-amber-600 dark:text-amber-500 hover:text-amber-500 dark:hover:text-amber-400 font-medium transition-colors">
              Analytics
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Creators</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {loading ? "Loading..." : `${creators.length} creators tracked`}
            </p>
          </div>

          {/* Filters */}
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
            {/* Board section */}
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

            {/* All creators */}
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
      </main>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{title}</h3>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm">{message}</p>
    </div>
  );
}
