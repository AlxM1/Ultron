"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, Download } from "lucide-react";

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

const DIMENSION_LABELS: Record<string, string> = {
  ai_citability: "AI Citability",
  schema_readiness: "Schema Readiness",
  eeat_signals: "E-E-A-T Signals",
  content_structure: "Content Structure",
  platform_visibility: "Platform Visibility",
};

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
