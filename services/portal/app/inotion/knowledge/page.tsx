"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink, FileText } from "lucide-react";
import ThemeToggle from "../../components/inotion/ThemeToggle";
import GlobalSearch from "../../components/inotion/GlobalSearch";
import KPICard from "../../components/inotion/KPICard";
import CollectionCard from "../../components/inotion/CollectionCard";
import StatusBadge, { StatusType } from "../../components/inotion/StatusBadge";

interface Metrics {
  totalDocuments: number;
  totalCollections: number;
  lastUpdated: string | null;
  systemStatus: StatusType;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  documentCount?: number;
  color?: string;
  updatedAt?: string;
}

interface Document {
  id: string;
  title: string;
  collectionId?: string;
  collection?: { name: string };
  updatedAt?: string;
  updatedBy?: { name: string };
  url?: string;
}

interface DashboardData {
  ok: boolean;
  error?: string;
  metrics: Metrics;
  collections: Collection[];
  recentDocuments: Document[];
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function KnowledgePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q ? `/api/inotion?search=${encodeURIComponent(q)}` : "/api/inotion";
      const res = await fetch(url);
      const json: DashboardData = await res.json();
      setData(json);
      setLastFetch(new Date());
    } catch {
      setData({
        ok: false,
        error: "Network error",
        metrics: { totalDocuments: 0, totalCollections: 0, lastUpdated: null, systemStatus: "FAILED" },
        collections: [],
        recentDocuments: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(() => fetchData(), 60000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const metrics = data?.metrics;
  const collections = data?.collections ?? [];
  const recentDocs = data?.recentDocuments ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/inotion" className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
              <ArrowLeft size={12} />
              Dashboard
            </Link>
            <span className="text-zinc-200 dark:text-zinc-700">/</span>
            <BookOpen size={12} className="text-zinc-500" />
            <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Knowledge Base</h1>
          </div>
          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="hidden sm:block text-xs text-zinc-400 dark:text-zinc-600 font-mono">
                {formatDate(lastFetch.toISOString())}
              </span>
            )}
            <GlobalSearch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Knowledge Base</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Outline — INotion knowledge graph</p>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_OUTLINE_URL || "https://inotion.00raiser.space"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            Open Outline <ExternalLink size={10} />
          </a>
        </div>

        {data && !data.ok && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-6 py-4 text-sm text-red-700 dark:text-red-400">
            <span className="font-semibold">Connection error</span> — {data.error}
          </div>
        )}

        {/* KPIs */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <KPICard label="Total Documents" value={loading ? "—" : (metrics?.totalDocuments ?? 0)} />
            <KPICard label="Collections" value={loading ? "—" : (metrics?.totalCollections ?? 0)} />
            <KPICard label="Last Updated" value={loading ? "—" : formatDate(metrics?.lastUpdated)} />
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm dark:shadow-none">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Status</p>
              {loading ? <div className="h-7 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" /> : (
                <StatusBadge status={(metrics?.systemStatus ?? "IDLE") as StatusType} className="text-sm px-3 py-1" />
              )}
            </div>
          </div>
        </section>

        {/* Collections */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">Collections</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm dark:shadow-none py-14 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
              <BookOpen className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-sm">No collections found</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((col) => (
                <CollectionCard key={col.id} name={col.name} description={col.description}
                  documentCount={col.documentCount} updatedAt={col.updatedAt} color={col.color} />
              ))}
            </div>
          )}
        </section>

        {/* Recent Documents */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">Recent Documents</h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />)}</div>
          ) : recentDocs.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm dark:shadow-none py-14 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
              <FileText className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-sm">No documents found</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">Document</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hidden sm:table-cell">Collection</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {recentDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <a href={doc.url || "#"} target="_blank" rel="noopener noreferrer"
                          className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors line-clamp-1">
                          {doc.title || "Untitled"}
                        </a>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-zinc-600 dark:text-zinc-400 hidden sm:table-cell">
                        {doc.collection?.name ?? "—"}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-zinc-400 dark:text-zinc-600 text-right font-mono whitespace-nowrap">
                        {formatDate(doc.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
