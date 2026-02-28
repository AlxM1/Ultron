"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Users, Video, FileText } from "lucide-react";
import ThemeToggle from "../../../components/inotion/ThemeToggle";

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
  strategic_value?: string;
  description?: string;
}

function fmtNum(n?: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CreatorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/creators");
        if (res.ok) {
          const data = await res.json();
          const found = (data.creators ?? []).find((c: Creator) => c.id === id);
          setCreator(found ?? null);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-sm text-zinc-400 dark:text-zinc-600 animate-pulse">Loading creator...</div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Creator not found: {id}</p>
        <Link href="/inotion/creators" className="text-xs text-amber-600 dark:text-amber-400 hover:underline">Back to creators</Link>
      </div>
    );
  }

  const coverage = creator.coverage_pct ?? (
    creator.content_count && creator.transcript_count
      ? Math.round((creator.transcript_count / creator.content_count) * 100)
      : 0
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/inotion/creators" className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} /> Creators
            </Link>
            <span className="text-zinc-200 dark:text-zinc-700">/</span>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{creator.name}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        {/* Profile header */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{creator.name}</h1>
              <div className="mt-1 flex items-center gap-3">
                {creator.handle && <span className="text-sm text-zinc-400 dark:text-zinc-600">@{creator.handle}</span>}
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {creator.platform}
                </span>
                {creator.strategic_value === "high" && (
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                    Priority
                  </span>
                )}
              </div>
            </div>
            {creator.url && (
              <a href={creator.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                <ExternalLink size={12} /> View channel
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBox icon={Users} label="Subscribers" value={fmtNum(creator.subscriber_count)} />
          <StatBox icon={Video} label="Content Items" value={fmtNum(creator.content_count)} />
          <StatBox icon={FileText} label="Transcripts" value={fmtNum(creator.transcript_count)} />
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm dark:shadow-none hover:border-amber-500/30 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Coverage</span>
            </div>
            <div className={`text-3xl font-bold tabular-nums tracking-tight ${
              coverage >= 80 ? "text-emerald-600 dark:text-emerald-400" :
              coverage >= 50 ? "text-amber-600 dark:text-amber-400" :
              "text-rose-600 dark:text-rose-400"
            }`}>{coverage}%</div>
            <div className="mt-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full ${
                coverage >= 80 ? "bg-emerald-500" : coverage >= 50 ? "bg-amber-500" : "bg-rose-500"
              }`} style={{ width: `${Math.min(100, coverage)}%` }} />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm dark:shadow-none">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">Details</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {creator.niche && <><dt className="text-zinc-400 dark:text-zinc-600">Niche</dt><dd className="text-zinc-900 dark:text-zinc-100">{creator.niche}</dd></>}
            <dt className="text-zinc-400 dark:text-zinc-600">Last Scraped</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{fmtDate(creator.last_scraped_at)}</dd>
            <dt className="text-zinc-400 dark:text-zinc-600">Platform</dt>
            <dd className="text-zinc-900 dark:text-zinc-100 capitalize">{creator.platform}</dd>
          </dl>
        </div>
      </main>
    </div>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm dark:shadow-none hover:border-amber-500/30 transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
        <Icon size={12} className="text-zinc-400 dark:text-zinc-600" />
      </div>
      <div className="text-3xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}
