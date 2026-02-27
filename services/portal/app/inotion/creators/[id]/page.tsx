"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Video, FileText, ExternalLink, AlertTriangle } from "lucide-react";
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
  bio?: string;
  recent_content?: { id: string; title: string; date?: string; url?: string }[];
}

function fmtNum(n?: number): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function fmtDate(iso?: string | null): string {
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
  const creatorId = params.id as string;
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Try to get from content-intel via our API
        const res = await fetch(`/api/creators?search=&limit=500`);
        if (res.ok) {
          const data = await res.json();
          const found = (data.creators ?? []).find(
            (c: Creator) => c.id === creatorId || c.id === parseInt(creatorId) as any
          );
          setCreator(found ?? null);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [creatorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-sm text-zinc-400 animate-pulse">Loading creator...</div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <AlertTriangle size={24} className="text-zinc-400" />
        <p className="text-sm text-zinc-500">Creator not found</p>
        <Link href="/inotion/creators" className="text-xs text-blue-500 hover:underline">Back to creators</Link>
      </div>
    );
  }

  const coverage = creator.coverage_pct ?? (
    creator.content_count && creator.transcript_count
      ? Math.round((creator.transcript_count / creator.content_count) * 100)
      : 0
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/inotion/creators" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} /> Creators
            </Link>
            <span className="text-zinc-200 dark:text-zinc-700">/</span>
            <span className="text-sm font-semibold">{creator.name}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        {/* Profile card */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold mb-1">{creator.name}</h1>
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                {creator.handle && <span>@{creator.handle}</span>}
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 capitalize">
                  {creator.platform}
                </span>
                {creator.strategic_value && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    creator.strategic_value === "high" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" :
                    "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}>
                    {creator.strategic_value} value
                  </span>
                )}
              </div>
            </div>
            {creator.url && (
              <a href={creator.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                <ExternalLink size={12} /> Profile
              </a>
            )}
          </div>
          {creator.bio && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-4">
              {creator.bio}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard icon={<Users size={14} />} label="Subscribers" value={fmtNum(creator.subscriber_count)} />
          <StatCard icon={<Video size={14} />} label="Content Items" value={fmtNum(creator.content_count)} />
          <StatCard icon={<FileText size={14} />} label="Transcripts" value={fmtNum(creator.transcript_count)} />
          <StatCard label="Coverage" value={`${coverage}%`} bar={coverage} />
          <StatCard label="Last Scraped" value={fmtDate(creator.last_scraped_at)} />
        </div>

        {/* Recent content */}
        {creator.recent_content && creator.recent_content.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
              Latest Content
            </h2>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400">Title</th>
                    <th className="text-right px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {creator.recent_content.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-5 py-3">
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            className="text-zinc-800 dark:text-zinc-200 hover:text-blue-500 transition-colors">
                            {item.title}
                          </a>
                        ) : (
                          <span className="text-zinc-800 dark:text-zinc-200">{item.title}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-400 text-right font-mono">{fmtDate(item.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, bar }: { icon?: React.ReactNode; label: string; value: string; bar?: number }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span className="text-zinc-400">{icon}</span>}
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{label}</p>
      </div>
      <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{value}</p>
      {bar !== undefined && (
        <div className="mt-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
          <div
            className={`h-full rounded-full ${bar >= 80 ? "bg-emerald-500" : bar >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
            style={{ width: `${Math.min(100, bar)}%` }}
          />
        </div>
      )}
    </div>
  );
}
