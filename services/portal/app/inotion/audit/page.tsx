"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, Download, Wrench, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { PRIORITY_ORDER, PRIORITY_COLORS, DIMENSION_LABELS } from "../_lib/constants";

interface DimensionData {
  score: number;
  issues: string[];
}

interface AuditReport {
  url: string;
  pages_crawled: number;
  overall_score: number;
  dimensions: Record<string, DimensionData>;
  page_scores: Array<{ url: string; score: number }>;
  recommendations: string[];
  audited_at: string;
}

interface Fix {
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  explanation: string;
  currentValue: string;
  fixedCode: string;
}

interface FixesResponse {
  fixes: Fix[];
  summary: { critical: number; high: number; medium: number; low: number };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium cursor-pointer transition-all
        ${copied
          ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-400 dark:text-white/50 hover:text-zinc-600 dark:hover:text-white/70"
        }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.low;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
      padding: "3px 8px", borderRadius: 4, background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      {priority}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-500">
      {category}
    </span>
  );
}

function FixesPanel({ report }: { report: AuditReport }) {
  const [fixes, setFixes] = useState<FixesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const loadFixes = async () => {
    if (fixes) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seoh/audit/fixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFixes(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const grouped = fixes ? PRIORITY_ORDER.reduce((acc, p) => {
    const items = fixes.fixes.filter(f => f.priority === p);
    if (items.length) acc.push({ priority: p, items });
    return acc;
  }, [] as { priority: string; items: Fix[] }[]) : [];

  return (
    <div className="bg-white dark:bg-white/[0.02] border border-amber-200 dark:border-amber-500/10 shadow-sm dark:shadow-none rounded-2xl p-6 mb-6">
      <div className={`flex items-center justify-between ${fixes ? "mb-5" : ""}`}>
        <h3 className="text-base font-semibold m-0 text-amber-600 dark:text-amber-500/90 flex items-center gap-2">
          <Wrench size={16} />
          Auto-Fix Suggestions
        </h3>
        {!fixes && (
          <button
            onClick={loadFixes}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 font-semibold text-[13px] cursor-pointer disabled:cursor-wait"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
            {loading ? "Generating fixes..." : "View Fixes"}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-[13px] mt-3">
          {error}
        </div>
      )}

      {fixes && (
        <>
          {/* Summary badges */}
          <div className="flex gap-3 mb-5 flex-wrap">
            {PRIORITY_ORDER.map(p => {
              const count = fixes.summary[p];
              if (!count) return null;
              const c = PRIORITY_COLORS[p];
              return (
                <span key={p} style={{
                  fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6,
                  background: c.bg, border: `1px solid ${c.border}`, color: c.text,
                }}>
                  {count} {p.charAt(0).toUpperCase() + p.slice(1)}
                </span>
              );
            })}
          </div>

          {/* Grouped fixes */}
          {grouped.map(group => (
            <div key={group.priority} className="mb-5">
              <div style={{
                fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                color: PRIORITY_COLORS[group.priority].text, marginBottom: 10,
              }}>
                {group.priority} ({group.items.length})
              </div>
              {group.items.map((fix, i) => {
                const idx = fixes.fixes.indexOf(fix);
                const isExpanded = expanded[idx] !== false;
                return (
                  <div key={i} className="bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.06] rounded-xl mb-2 overflow-hidden">
                    <div
                      onClick={() => setExpanded(prev => ({ ...prev, [idx]: !isExpanded }))}
                      className={`flex items-center gap-2 px-4 py-3 cursor-pointer ${isExpanded ? "border-b border-zinc-100 dark:border-white/[0.04]" : ""}`}
                    >
                      {isExpanded
                        ? <ChevronDown size={14} className="text-zinc-400 dark:text-white/30" />
                        : <ChevronRight size={14} className="text-zinc-400 dark:text-white/30" />
                      }
                      <CategoryBadge category={fix.category} />
                      <PriorityBadge priority={fix.priority} />
                      <span className="text-[13px] text-zinc-600 dark:text-white/70 flex-1">{fix.explanation}</span>
                    </div>
                    {isExpanded && (
                      <div className="px-4 py-3">
                        {fix.currentValue && (
                          <div className="mb-3">
                            <div className="text-[10px] font-semibold text-zinc-400 dark:text-white/35 uppercase tracking-wide mb-1.5">
                              Current
                            </div>
                            <pre className="m-0 p-3 rounded-lg bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/[0.06] text-zinc-500 dark:text-white/50 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                              {fix.currentValue}
                            </pre>
                          </div>
                        )}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-semibold text-zinc-400 dark:text-white/35 uppercase tracking-wide">
                              Fixed Code
                            </span>
                            <CopyButton text={fix.fixedCode} />
                          </div>
                          <pre className="m-0 p-3 rounded-lg bg-zinc-100 dark:bg-black/40 border border-emerald-200 dark:border-emerald-500/15 text-zinc-700 dark:text-white/80 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                            {fix.fixedCode}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-zinc-200 dark:stroke-white/[0.06]" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontSize: size * 0.35, fontWeight: 700, color, fontFamily: "'SF Mono', monospace" }}>
          {score}
        </span>
        <span className="text-[11px] text-zinc-400 dark:text-white/40 tracking-widest uppercase">
          GEO Score
        </span>
      </div>
    </div>
  );
}

function DimensionBar({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] text-zinc-600 dark:text-white/70 font-medium">{label}</span>
        <span style={{ fontSize: 13, color, fontFamily: "'SF Mono', monospace", fontWeight: 600 }}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-white/[0.06] overflow-hidden">
        <div style={{
          height: "100%", borderRadius: 9999, background: color, width: `${score}%`,
          transition: "width 1s ease-out",
          boxShadow: `0 0 8px ${color}40`,
        }} />
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/seoh/audit/full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setReport(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-[#0a0a0f] dark:via-[#0d1117] dark:to-[#0a0f1a] text-zinc-900 dark:text-white px-6 py-10">
      <div className="max-w-[900px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/inotion" className="text-amber-600 dark:text-amber-500/70 no-underline flex items-center">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold m-0 bg-gradient-to-br from-amber-500 to-amber-600 bg-clip-text text-transparent">
            SEO Audit
          </h1>
          <span className="text-xs text-zinc-400 dark:text-white/30 font-mono">
            GEO Readiness Scanner
          </span>
        </div>

        {/* Input */}
        <div className="flex gap-3 mb-8 bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-amber-500/15 shadow-sm dark:shadow-none rounded-xl p-2">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && runAudit()}
            placeholder="Enter URL to audit (e.g. seoh.ca)"
            className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-white text-[15px] px-4 py-2.5 font-mono placeholder:text-zinc-400 dark:placeholder:text-white/30"
          />
          <button
            onClick={runAudit}
            disabled={loading || !url.trim()}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg border-none font-semibold text-sm transition-all
              ${loading
                ? "bg-amber-100 dark:bg-amber-500/20 text-zinc-400 dark:text-white/50 cursor-wait"
                : "bg-gradient-to-br from-amber-500 to-amber-600 text-white dark:text-black cursor-pointer hover:from-amber-400 hover:to-amber-500"
              }`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? "Scanning..." : "Run Audit"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-amber-500 dark:text-amber-500/60 text-sm">
            <Loader2 size={32} className="animate-spin mb-4 mx-auto" />
            <div>Deep crawling and scoring pages. This may take a minute.</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {report && (
          <div>
            {/* Download PDF Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/seoh/audit/pdf", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(report),
                    });
                    if (!res.ok) throw new Error("PDF generation failed");
                    const blob = await res.blob();
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `geo-audit-${report.url.replace(/[^a-z0-9]/gi, "-")}.pdf`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  } catch (err) {
                    console.error("PDF download failed:", err);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 font-semibold text-[13px] cursor-pointer transition-all hover:bg-amber-100 dark:hover:bg-amber-500/20"
              >
                <Download size={15} />
                Download PDF Report
              </button>
            </div>

            {/* Fixes */}
            <FixesPanel report={report} />

            {/* Score + Dimensions */}
            <div className="grid grid-cols-[auto_1fr] gap-12 bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-amber-500/10 shadow-sm dark:shadow-none rounded-2xl p-8 mb-6">
              <div className="flex flex-col items-center gap-3">
                <ScoreRing score={report.overall_score} />
                <div className="text-xs text-zinc-400 dark:text-white/40 text-center">
                  {report.pages_crawled} page{report.pages_crawled !== 1 ? "s" : ""} analyzed
                </div>
              </div>
              <div>
                {Object.entries(report.dimensions).map(([key, dim]) => (
                  <DimensionBar key={key} label={DIMENSION_LABELS[key] || key} score={dim.score} />
                ))}
              </div>
            </div>

            {/* Issues */}
            {Object.entries(report.dimensions).some(([, d]) => d.issues.length > 0) && (
              <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-amber-500/10 shadow-sm dark:shadow-none rounded-2xl p-6 mb-6">
                <h3 className="text-base font-semibold mb-4 text-amber-600 dark:text-amber-500/90">
                  Issues Found
                </h3>
                {Object.entries(report.dimensions).map(([key, dim]) =>
                  dim.issues.length > 0 ? (
                    <div key={key} className="mb-4">
                      <div className="text-xs font-semibold text-zinc-400 dark:text-white/50 mb-1.5 uppercase tracking-wide">
                        {DIMENSION_LABELS[key] || key}
                      </div>
                      {dim.issues.map((issue, i) => (
                        <div key={i} className="text-[13px] text-zinc-600 dark:text-white/60 py-1 pl-3 border-l-2 border-amber-200 dark:border-amber-500/20 mb-1">
                          {issue}
                        </div>
                      ))}
                    </div>
                  ) : null
                )}
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-amber-500/10 shadow-sm dark:shadow-none rounded-2xl p-6 mb-6">
                <h3 className="text-base font-semibold mb-4 text-amber-600 dark:text-amber-500/90">
                  Recommendations
                </h3>
                {report.recommendations.map((rec, i) => (
                  <div key={i} className={`flex gap-2.5 text-[13px] text-zinc-600 dark:text-white/60 py-2 ${i < report.recommendations.length - 1 ? "border-b border-zinc-100 dark:border-white/[0.04]" : ""}`}>
                    <span className="text-amber-500 dark:text-amber-500/60 font-mono text-[11px] shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {rec}
                  </div>
                ))}
              </div>
            )}

            {/* Page Scores */}
            {report.page_scores.length > 1 && (
              <div className="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-amber-500/10 shadow-sm dark:shadow-none rounded-2xl p-6">
                <h3 className="text-base font-semibold mb-4 text-amber-600 dark:text-amber-500/90">
                  Page Breakdown
                </h3>
                {report.page_scores.map((p, i) => (
                  <div key={i} className={`flex justify-between items-center py-2 ${i < report.page_scores.length - 1 ? "border-b border-zinc-100 dark:border-white/[0.04]" : ""}`}>
                    <span className="text-[13px] text-zinc-600 dark:text-white/60 overflow-hidden text-ellipsis whitespace-nowrap max-w-[70%] font-mono">
                      {p.url.replace(/^https?:\/\//, "")}
                    </span>
                    <span style={{
                      fontSize: 14, fontWeight: 600, fontFamily: "'SF Mono', monospace",
                      color: scoreColor(p.score),
                    }}>
                      {p.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
