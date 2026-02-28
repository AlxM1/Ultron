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
      style={{
        display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
        color: copied ? "#22c55e" : "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer",
        fontWeight: 500, transition: "all 0.2s",
      }}
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
    <span style={{
      fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
      padding: "3px 8px", borderRadius: 4,
      background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b",
    }}>
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
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,158,11,0.1)",
      borderRadius: 16, padding: 24, marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: fixes ? 20 : 0 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "rgba(245,158,11,0.9)", display: "flex", alignItems: "center", gap: 8 }}>
          <Wrench size={16} />
          Auto-Fix Suggestions
        </h3>
        {!fixes && (
          <button
            onClick={loadFixes}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 8,
              border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.1)",
              color: "#f59e0b", fontWeight: 600, fontSize: 13, cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Wrench size={14} />}
            {loading ? "Generating fixes..." : "View Fixes"}
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 13, marginTop: 12 }}>
          {error}
        </div>
      )}

      {fixes && (
        <>
          {/* Summary badges */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
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
            <div key={group.priority} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                color: PRIORITY_COLORS[group.priority].text, marginBottom: 10,
              }}>
                {group.priority} ({group.items.length})
              </div>
              {group.items.map((fix, i) => {
                const idx = fixes.fixes.indexOf(fix);
                const isExpanded = expanded[idx] !== false; // default expanded
                return (
                  <div key={i} style={{
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10, marginBottom: 8, overflow: "hidden",
                  }}>
                    <div
                      onClick={() => setExpanded(prev => ({ ...prev, [idx]: !isExpanded }))}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", cursor: "pointer",
                        borderBottom: isExpanded ? "1px solid rgba(255,255,255,0.04)" : "none",
                      }}
                    >
                      {isExpanded ? <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.3)" }} /> : <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.3)" }} />}
                      <CategoryBadge category={fix.category} />
                      <PriorityBadge priority={fix.priority} />
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", flex: 1 }}>{fix.explanation}</span>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: "12px 16px" }}>
                        {fix.currentValue && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                              Current
                            </div>
                            <pre style={{
                              margin: 0, padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.4)",
                              border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)",
                              fontSize: 12, fontFamily: "'SF Mono', Consolas, monospace", overflowX: "auto", whiteSpace: "pre-wrap",
                            }}>
                              {fix.currentValue}
                            </pre>
                          </div>
                        )}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              Fixed Code
                            </span>
                            <CopyButton text={fix.fixedCode} />
                          </div>
                          <pre style={{
                            margin: 0, padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.4)",
                            border: "1px solid rgba(34,197,94,0.15)", color: "rgba(255,255,255,0.8)",
                            fontSize: 12, fontFamily: "'SF Mono', Consolas, monospace", overflowX: "auto", whiteSpace: "pre-wrap",
                          }}>
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.35, fontWeight: 700, color, fontFamily: "'SF Mono', monospace" }}>
          {score}
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          GEO Score
        </span>
      </div>
    </div>
  );
}

function DimensionBar({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, color, fontFamily: "'SF Mono', monospace", fontWeight: 600 }}>{score}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3, background: color, width: `${score}%`,
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
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)",
      color: "#fff",
      padding: "40px 24px",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <Link href="/inotion" style={{
            color: "rgba(245,158,11,0.7)", textDecoration: "none", display: "flex", alignItems: "center",
          }}>
            <ArrowLeft size={18} />
          </Link>
          <h1 style={{
            fontSize: 24, fontWeight: 700, margin: 0,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            SEO Audit
          </h1>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'SF Mono', monospace" }}>
            GEO Readiness Scanner
          </span>
        </div>

        {/* Input */}
        <div style={{
          display: "flex", gap: 12, marginBottom: 32,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(245,158,11,0.15)",
          borderRadius: 12, padding: 8,
        }}>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && runAudit()}
            placeholder="Enter URL to audit (e.g. seoh.ca)"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#fff", fontSize: 15, padding: "10px 16px",
              fontFamily: "'SF Mono', monospace",
            }}
          />
          <button
            onClick={runAudit}
            disabled={loading || !url.trim()}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: loading ? "rgba(245,158,11,0.2)" : "linear-gradient(135deg, #f59e0b, #d97706)",
              color: loading ? "rgba(255,255,255,0.5)" : "#000",
              fontWeight: 600, fontSize: 14, cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={16} />}
            {loading ? "Scanning..." : "Run Audit"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{
            textAlign: "center", padding: 60,
            color: "rgba(245,158,11,0.6)", fontSize: 14,
          }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite", marginBottom: 16 }} />
            <div>Deep crawling and scoring pages. This may take a minute.</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: 16, borderRadius: 8,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444", fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {report && (
          <div>
            {/* Download PDF Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
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
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.3)",
                  background: "rgba(245,158,11,0.1)", color: "#f59e0b",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.1)"; }}
              >
                <Download size={15} />
                Download PDF Report
              </button>
            </div>
            {/* Fixes */}
            <FixesPanel report={report} />

            {/* Score + Dimensions */}
            <div style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: 48,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(245,158,11,0.1)",
              borderRadius: 16, padding: 32, marginBottom: 24,
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <ScoreRing score={report.overall_score} />
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
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
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(245,158,11,0.1)",
                borderRadius: 16, padding: 24, marginBottom: 24,
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "rgba(245,158,11,0.9)" }}>
                  Issues Found
                </h3>
                {Object.entries(report.dimensions).map(([key, dim]) =>
                  dim.issues.length > 0 ? (
                    <div key={key} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {DIMENSION_LABELS[key] || key}
                      </div>
                      {dim.issues.map((issue, i) => (
                        <div key={i} style={{
                          fontSize: 13, color: "rgba(255,255,255,0.6)", padding: "4px 0 4px 12px",
                          borderLeft: "2px solid rgba(245,158,11,0.2)",
                          marginBottom: 4,
                        }}>
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
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(245,158,11,0.1)",
                borderRadius: 16, padding: 24, marginBottom: 24,
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "rgba(245,158,11,0.9)" }}>
                  Recommendations
                </h3>
                {report.recommendations.map((rec, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.6)",
                    padding: "8px 0", borderBottom: i < report.recommendations.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    <span style={{ color: "rgba(245,158,11,0.6)", fontFamily: "'SF Mono', monospace", fontSize: 11, flexShrink: 0 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {rec}
                  </div>
                ))}
              </div>
            )}

            {/* Page Scores */}
            {report.page_scores.length > 1 && (
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(245,158,11,0.1)",
                borderRadius: 16, padding: 24,
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "rgba(245,158,11,0.9)" }}>
                  Page Breakdown
                </h3>
                {report.page_scores.map((p, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 0",
                    borderBottom: i < report.page_scores.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    <span style={{
                      fontSize: 13, color: "rgba(255,255,255,0.6)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%",
                      fontFamily: "'SF Mono', monospace",
                    }}>
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
