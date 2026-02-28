"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, TrendingUp, TrendingDown, Minus, Clock, Target, CheckCircle, AlertTriangle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DIMENSION_LABELS, DIMENSION_COLORS } from "../../_lib/constants";

interface DimensionData {
  score: number;
  issues: string[];
}

interface Audit {
  id: string;
  url: string;
  overall_score: number;
  dimensions: Record<string, DimensionData>;
  recommendations: string[];
  completed_at: string;
}

interface TrendData {
  domain: string;
  dataPoints: Array<{
    date: string;
    overall_score: number;
    dimensions: Record<string, number>;
  }>;
  change: { overall: number; dimensions: Record<string, number> } | null;
  issuesDelta: { fixed: number; new: number; fixedList: string[]; newList: string[] } | null;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function ChangeIndicator({ value, label }: { value: number; label?: string }) {
  const color = value > 0 ? "#22c55e" : value < 0 ? "#ef4444" : "rgba(255,255,255,0.4)";
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Icon size={14} style={{ color }} />
      <span style={{ color, fontWeight: 600, fontFamily: "'SF Mono', monospace", fontSize: 13 }}>
        {value > 0 ? "+" : ""}{value}
      </span>
      {label && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{label}</span>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(15,15,20,0.95)", border: "1px solid rgba(245,158,11,0.2)",
      borderRadius: 8, padding: 12, fontSize: 12,
    }}>
      <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 8, fontSize: 11 }}>
        {new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{p.name}:</span>
          <span style={{ color: p.color, fontWeight: 600, fontFamily: "'SF Mono', monospace" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditHistoryPage() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  const loadHistory = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setError(null);
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    try {
      const [histRes, trendRes] = await Promise.all([
        fetch(`/api/seoh/audit/history/${encodeURIComponent(d)}`),
        fetch(`/api/seoh/audit/trends/${encodeURIComponent(d)}`),
      ]);
      if (!histRes.ok || !trendRes.ok) throw new Error("Failed to fetch data");
      const histData = await histRes.json();
      const trendData = await trendRes.json();
      setAudits(histData.audits);
      setTrends(trendData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const trackDomain = async () => {
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    setTracking(true);
    try {
      await fetch("/api/seoh/audit/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: d }),
      });
    } catch {} finally {
      setTracking(false);
    }
  };

  const chartData = trends?.dataPoints.map(dp => ({
    date: dp.date,
    "GEO Score": dp.overall_score,
    ...Object.entries(dp.dimensions).reduce((acc, [k, v]) => {
      acc[DIMENSION_LABELS[k] || k] = v;
      return acc;
    }, {} as Record<string, number>),
  })) || [];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)",
      color: "#fff", padding: "40px 24px",
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <Link href="/inotion" style={{ color: "rgba(245,158,11,0.7)", textDecoration: "none", display: "flex", alignItems: "center" }}>
            <ArrowLeft size={18} />
          </Link>
          <h1 style={{
            fontSize: 24, fontWeight: 700, margin: 0,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Score History
          </h1>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'SF Mono', monospace" }}>
            Track GEO scores over time
          </span>
        </div>

        {/* Input */}
        <div style={{
          display: "flex", gap: 12, marginBottom: 32,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,158,11,0.15)",
          borderRadius: 12, padding: 8,
        }}>
          <input
            type="text" value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && loadHistory()}
            placeholder="Enter domain (e.g. seoh.ca)"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#fff", fontSize: 15, padding: "10px 16px", fontFamily: "'SF Mono', monospace",
            }}
          />
          <button onClick={loadHistory} disabled={loading || !domain.trim()} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 8, border: "none",
            background: loading ? "rgba(245,158,11,0.2)" : "linear-gradient(135deg, #f59e0b, #d97706)",
            color: loading ? "rgba(255,255,255,0.5)" : "#000", fontWeight: 600, fontSize: 14,
            cursor: loading ? "wait" : "pointer",
          }}>
            {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={16} />}
            {loading ? "Loading..." : "View History"}
          </button>
        </div>

        {error && (
          <div style={{ padding: 16, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 14, marginBottom: 24 }}>
            {error}
          </div>
        )}

        {audits.length > 0 && trends && (
          <>
            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              {/* Latest score */}
              <div style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,158,11,0.1)",
                borderRadius: 12, padding: 20,
              }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  Latest Score
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: scoreColor(audits[0].overall_score), fontFamily: "'SF Mono', monospace" }}>
                    {audits[0].overall_score}
                  </span>
                  {trends.change && <ChangeIndicator value={trends.change.overall} label="since last" />}
                </div>
              </div>

              {/* Total audits */}
              <div style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,158,11,0.1)",
                borderRadius: 12, padding: 20,
              }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  Total Audits
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={18} style={{ color: "rgba(245,158,11,0.6)" }} />
                  <span style={{ fontSize: 36, fontWeight: 700, color: "#f59e0b", fontFamily: "'SF Mono', monospace" }}>
                    {audits.length}
                  </span>
                </div>
              </div>

              {/* Issues delta */}
              {trends.issuesDelta && (
                <>
                  <div style={{
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(34,197,94,0.15)",
                    borderRadius: 12, padding: 20,
                  }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      Issues Fixed
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={18} style={{ color: "#22c55e" }} />
                      <span style={{ fontSize: 36, fontWeight: 700, color: "#22c55e", fontFamily: "'SF Mono', monospace" }}>
                        {trends.issuesDelta.fixed}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(239,68,68,0.15)",
                    borderRadius: 12, padding: 20,
                  }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      New Issues
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle size={18} style={{ color: "#ef4444" }} />
                      <span style={{ fontSize: 36, fontWeight: 700, color: "#ef4444", fontFamily: "'SF Mono', monospace" }}>
                        {trends.issuesDelta.new}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Track button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
              <button onClick={trackDomain} disabled={tracking} style={{
                padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.3)",
                background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: 600, fontSize: 13,
                cursor: tracking ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 8,
              }}>
                <Target size={14} />
                {tracking ? "Tracking..." : "Track for Weekly Re-Audit"}
              </button>
            </div>

            {/* Overall score chart */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,158,11,0.1)",
              borderRadius: 16, padding: 24, marginBottom: 24,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "rgba(245,158,11,0.9)" }}>
                GEO Score Over Time
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11}
                    tickFormatter={v => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="GEO Score" stroke="#f59e0b" strokeWidth={3}
                    dot={{ fill: "#f59e0b", r: 4 }} activeDot={{ r: 6, fill: "#f59e0b" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Dimension trends chart */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,158,11,0.1)",
              borderRadius: 16, padding: 24, marginBottom: 24,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "rgba(245,158,11,0.9)" }}>
                Dimension Trends
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11}
                    tickFormatter={v => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
                  {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                    <Line
                      key={key} type="monotone" dataKey={label}
                      stroke={DIMENSION_COLORS[key]} strokeWidth={2}
                      dot={{ fill: DIMENSION_COLORS[key], r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Per-dimension change indicators */}
            {trends.change && (
              <div style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,158,11,0.1)",
                borderRadius: 16, padding: 24, marginBottom: 24,
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "rgba(245,158,11,0.9)" }}>
                  Changes Since Last Audit
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {Object.entries(trends.change.dimensions).map(([key, val]) => (
                    <div key={key} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", borderRadius: 8,
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{DIMENSION_LABELS[key] || key}</span>
                      <ChangeIndicator value={val} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit list */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,158,11,0.1)",
              borderRadius: 16, padding: 24,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "rgba(245,158,11,0.9)" }}>
                All Audits
              </h3>
              {audits.map((audit, i) => (
                <Link
                  key={audit.id}
                  href={`/inotion/audit?prefill=${encodeURIComponent(audit.url)}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 16px", borderRadius: 8, marginBottom: 6,
                    background: i === 0 ? "rgba(245,158,11,0.05)" : "transparent",
                    border: i === 0 ? "1px solid rgba(245,158,11,0.15)" : "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = i === 0 ? "rgba(245,158,11,0.05)" : "transparent"; }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "'SF Mono', monospace" }}>
                        {new Date(audit.completed_at).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", year: "numeric",
                        })}
                        {i === 0 && (
                          <span style={{
                            marginLeft: 10, fontSize: 10, padding: "2px 8px", borderRadius: 4,
                            background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 600,
                          }}>
                            LATEST
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                        {audit.url}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 20, fontWeight: 700, fontFamily: "'SF Mono', monospace",
                      color: scoreColor(audit.overall_score),
                    }}>
                      {audit.overall_score}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {!loading && audits.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            Enter a domain to view its audit history and score trends.
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
