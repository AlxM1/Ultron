"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Minus, Loader2, Trophy, TrendingUp, TrendingDown } from "lucide-react";

interface DimensionData {
  score: number;
  issues: string[];
}

interface SiteResult {
  url: string;
  overall_score: number;
  dimensions: Record<string, DimensionData>;
  recommendations: string[];
}

interface SiteAnalysis {
  url: string;
  overall_score: number;
  advantages: string[];
  disadvantages: string[];
}

interface ComparisonResult {
  id?: string;
  sites: SiteResult[];
  dimension_winners: Record<string, { url: string; score: number }>;
  overall_winner: { url: string; score: number };
  site_analysis: SiteAnalysis[];
  compared_at: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  ai_citability: "AI Citability",
  schema_readiness: "Schema Readiness",
  eeat_signals: "E-E-A-T Signals",
  content_structure: "Content Structure",
  platform_visibility: "Platform Visibility",
};

const DIMENSIONS = Object.keys(DIMENSION_LABELS);

function cellColor(score: number, allScores: number[]): string {
  const max = Math.max(...allScores);
  const min = Math.min(...allScores);
  if (allScores.length < 2 || max === min) return "bg-zinc-800/50";
  if (score === max) return "bg-emerald-900/60 text-emerald-300";
  if (score === min) return "bg-red-900/40 text-red-300";
  return "bg-zinc-800/50 text-zinc-300";
}

function scoreBadge(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function shortUrl(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

export default function ComparePage() {
  const [urls, setUrls] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const addUrl = () => { if (urls.length < 5) setUrls([...urls, ""]); };
  const removeUrl = (i: number) => { if (urls.length > 2) setUrls(urls.filter((_, idx) => idx !== i)); };
  const updateUrl = (i: number, v: string) => { const u = [...urls]; u[i] = v; setUrls(u); };

  const runComparison = async () => {
    const valid = urls.filter(u => u.trim());
    if (valid.length < 2) { setError("Enter at least 2 URLs"); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/seoh/audit/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: valid }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Compare failed"); }
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/inotion/audit" className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Compare Sites</h1>
            <p className="text-zinc-500 text-sm">GEO audit side-by-side comparison</p>
          </div>
        </div>

        {/* URL Inputs */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
          <div className="space-y-3">
            {urls.map((url, i) => (
              <div key={i} className="flex gap-3 items-center">
                <span className="text-zinc-500 text-sm w-6 text-right">{i + 1}.</span>
                <input
                  type="text"
                  value={url}
                  onChange={e => updateUrl(i, e.target.value)}
                  placeholder="example.com"
                  className="flex-1 px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 text-sm"
                  onKeyDown={e => e.key === "Enter" && runComparison()}
                />
                {urls.length > 2 && (
                  <button onClick={() => removeUrl(i)} className="p-2 rounded-lg bg-zinc-800/50 hover:bg-red-900/30 text-zinc-500 hover:text-red-400 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            {urls.length < 5 && (
              <button onClick={addUrl} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 text-sm transition-colors">
                <Plus className="w-4 h-4" /> Add URL
              </button>
            )}
            <button
              onClick={runComparison}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors ml-auto"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Comparing...</> : "Compare"}
            </button>
          </div>
          {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Winner Banner */}
            <div className="bg-gradient-to-r from-emerald-900/30 to-zinc-900/50 border border-emerald-800/50 rounded-xl p-6 flex items-center gap-4">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-zinc-400 text-sm">Overall Winner</p>
                <p className="text-xl font-bold text-emerald-300">{shortUrl(result.overall_winner.url)}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-3xl font-bold text-emerald-400">{result.overall_winner.score}</p>
                <p className="text-zinc-500 text-xs">/ 100</p>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-3 text-zinc-500 text-sm font-medium">Dimension</th>
                      {result.sites.map(site => (
                        <th key={site.url} className="text-center px-4 py-3 text-sm font-medium">
                          <span className={site.url === result.overall_winner.url ? "text-emerald-400" : "text-zinc-300"}>
                            {shortUrl(site.url)}
                          </span>
                        </th>
                      ))}
                      <th className="text-center px-4 py-3 text-zinc-500 text-sm font-medium">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Overall row */}
                    <tr className="border-b border-zinc-800 bg-zinc-800/30">
                      <td className="px-4 py-3 text-sm font-semibold text-zinc-200">Overall Score</td>
                      {result.sites.map(site => {
                        const scores = result.sites.map(s => s.overall_score);
                        return (
                          <td key={site.url} className={`text-center px-4 py-3 ${cellColor(site.overall_score, scores)}`}>
                            <span className={`text-lg font-bold ${scoreBadge(site.overall_score)}`}>{site.overall_score}</span>
                          </td>
                        );
                      })}
                      <td className="text-center px-4 py-3 text-sm text-emerald-400 font-medium">
                        {shortUrl(result.overall_winner.url)}
                      </td>
                    </tr>
                    {/* Dimension rows */}
                    {DIMENSIONS.map(dim => {
                      const scores = result.sites.map(s => s.dimensions[dim]?.score ?? 0);
                      const winner = result.dimension_winners[dim];
                      return (
                        <tr key={dim} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                          <td className="px-4 py-3 text-sm text-zinc-300">{DIMENSION_LABELS[dim]}</td>
                          {result.sites.map((site, i) => {
                            const score = site.dimensions[dim]?.score ?? 0;
                            return (
                              <td key={site.url} className={`text-center px-4 py-2.5 ${cellColor(score, scores)}`}>
                                <span className={`font-semibold ${scoreBadge(score)}`}>{score}</span>
                              </td>
                            );
                          })}
                          <td className="text-center px-4 py-2.5 text-sm text-zinc-400">
                            {winner && shortUrl(winner.url)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Site Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.site_analysis.map(site => (
                <div key={site.url} className={`bg-zinc-900/50 border rounded-xl p-5 ${site.url === result.overall_winner.url ? "border-emerald-800/50" : "border-zinc-800"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">{shortUrl(site.url)}</h3>
                    <span className={`text-lg font-bold ${scoreBadge(site.overall_score)}`}>{site.overall_score}</span>
                  </div>
                  {site.advantages.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mb-1"><TrendingUp className="w-3 h-3" /> Strengths</p>
                      {site.advantages.map((a, i) => (
                        <p key={i} className="text-xs text-zinc-400 pl-4">{a}</p>
                      ))}
                    </div>
                  )}
                  {site.disadvantages.length > 0 && (
                    <div>
                      <p className="text-xs text-red-500 font-medium flex items-center gap-1 mb-1"><TrendingDown className="w-3 h-3" /> Weaknesses</p>
                      {site.disadvantages.map((d, i) => (
                        <p key={i} className="text-xs text-zinc-400 pl-4">{d}</p>
                      ))}
                    </div>
                  )}
                  {site.advantages.length === 0 && site.disadvantages.length === 0 && (
                    <p className="text-xs text-zinc-600">No significant differences from competitors</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
