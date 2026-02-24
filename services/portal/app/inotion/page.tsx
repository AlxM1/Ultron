"use client";

import { useEffect, useState, useCallback } from "react";
import KPICard from "../components/inotion/KPICard";
import StatusBadge, { StatusType } from "../components/inotion/StatusBadge";
import CollectionCard from "../components/inotion/CollectionCard";
import ThemeToggle from "../components/inotion/ThemeToggle";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

function formatDateFull(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function INotionPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
        error: "Network error — could not reach API",
        metrics: {
          totalDocuments: 0,
          totalCollections: 0,
          lastUpdated: null,
          systemStatus: "FAILED",
        },
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(search);
    fetchData(search);
  }

  const metrics = data?.metrics;
  const collections = data?.collections ?? [];
  const recentDocs = data?.recentDocuments ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: back + title */}
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors tracking-wide"
            >
              Portal
            </a>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              INotion
            </h1>
          </div>

          {/* Right: refresh indicator + search + toggle */}
          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="hidden sm:block text-xs text-zinc-400 dark:text-zinc-600 font-mono">
                updated {formatDate(lastFetch.toISOString())}
              </span>
            )}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents..."
                className="w-52 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
              />
              <button
                type="submit"
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition"
              >
                Search
              </button>
            </form>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-screen-xl mx-auto px-6 py-10 space-y-12">

        {/* Error banner */}
        {data && !data.ok && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-5 py-3 text-sm text-red-700 dark:text-red-400">
            <span className="font-semibold">Connection error</span>{" "}
            {data.error}. Showing cached or empty data.
          </div>
        )}

        {/* ── KPI Row ── */}
        <section>
          <SectionLabel>Overview</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <KPICard
              label="Total Documents"
              value={loading ? "—" : (metrics?.totalDocuments ?? 0)}
            />
            <KPICard
              label="Collections"
              value={loading ? "—" : (metrics?.totalCollections ?? 0)}
            />
            <KPICard
              label="Last Updated"
              value={loading ? "—" : formatDate(metrics?.lastUpdated)}
              sub={metrics?.lastUpdated ? formatDateFull(metrics.lastUpdated) : undefined}
            />
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">
                System Status
              </p>
              <div className="flex items-center">
                {loading ? (
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">—</span>
                ) : (
                  <StatusBadge
                    status={(metrics?.systemStatus ?? "IDLE") as StatusType}
                    className="text-sm px-3 py-1"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Collections Grid ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Collections</SectionLabel>
            <a
              href={`${process.env.NEXT_PUBLIC_OUTLINE_URL || "http://localhost:3010"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Open Outline
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <EmptyState message="No collections found. Check Outline connectivity." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((col) => (
                <CollectionCard
                  key={col.id}
                  name={col.name}
                  description={col.description}
                  documentCount={col.documentCount}
                  updatedAt={col.updatedAt}
                  color={col.color}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Recent Documents ── */}
        <section>
          <SectionLabel>
            {searchQuery ? `Search Results — "${searchQuery}"` : "Recent Documents"}
          </SectionLabel>

          {loading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : recentDocs.length === 0 ? (
            <div className="mt-4">
              <EmptyState message="No documents found." />
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      Document
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hidden sm:table-cell">
                      Collection
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hidden md:table-cell">
                      Author
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <a
                          href={doc.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors line-clamp-1"
                        >
                          {doc.title || "Untitled"}
                        </a>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                        {doc.collection?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 hidden md:table-cell">
                        {doc.updatedBy?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-400 dark:text-zinc-500 text-right font-mono whitespace-nowrap">
                        {formatDate(doc.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Agent Activity ── */}
        <section>
          <SectionLabel>Agent Activity</SectionLabel>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Operations log sourced from Outline documents tagged with agent activity.
          </p>
          <AgentActivityTable docs={recentDocs} loading={loading} />
        </section>

      </main>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
      {children}
    </h2>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-10 text-center">
      <p className="text-sm text-zinc-400 dark:text-zinc-500">{message}</p>
    </div>
  );
}

// Derive agent activity rows from recent documents by looking for agent-authored docs
function AgentActivityTable({
  docs,
  loading,
}: {
  docs: Document[];
  loading: boolean;
}) {
  const agentDocs = docs.filter(
    (d) =>
      d.updatedBy?.name?.toLowerCase().includes("agent") ||
      d.title?.toLowerCase().includes("agent") ||
      d.title?.toLowerCase().includes("operation") ||
      d.title?.toLowerCase().includes("workflow") ||
      d.title?.toLowerCase().includes("task")
  );

  if (loading) {
    return (
      <div className="mt-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (agentDocs.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState message="No agent activity detected in recent documents." />
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Document / Operation
            </th>
            <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 hidden sm:table-cell">
              Collection
            </th>
            <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Status
            </th>
            <th className="text-right px-5 py-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {agentDocs.map((doc) => {
            const status: StatusType = doc.title?.toLowerCase().includes("fail")
              ? "FAILED"
              : doc.title?.toLowerCase().includes("pending")
              ? "PENDING"
              : "ACTIVE";

            return (
              <tr
                key={doc.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <td className="px-5 py-3.5 font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1">
                  <a
                    href={doc.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors"
                  >
                    {doc.title || "Untitled"}
                  </a>
                </td>
                <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                  {doc.collection?.name ?? "—"}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={status} />
                </td>
                <td className="px-5 py-3.5 text-xs text-zinc-400 dark:text-zinc-500 text-right font-mono whitespace-nowrap">
                  {formatDate(doc.updatedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
