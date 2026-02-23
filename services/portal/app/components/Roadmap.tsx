"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, Loader2, Circle, Calendar, TrendingUp } from "lucide-react";

interface RoadmapTask {
  name: string;
  status: "done" | "in-progress" | "not-started";
}

interface RoadmapPhase {
  id: number;
  title: string;
  status: "active" | "upcoming" | "completed";
  dateRange: string;
  progress: number;
  taskCounts: { total: number; done: number; inProgress: number; notStarted: number };
  tasks: RoadmapTask[];
}

interface RoadmapData {
  lastUpdated: string;
  fileUpdatedAt: string;
  phases: RoadmapPhase[];
}

function TaskIcon({ status }: { status: RoadmapTask["status"] }) {
  if (status === "done") return <CheckCircle2 size={14} style={{ color: "#22c55e", flexShrink: 0 }} />;
  if (status === "in-progress") return <Loader2 size={14} style={{ color: "#4af3ff", flexShrink: 0, animation: "spin 2s linear infinite" }} />;
  return <Circle size={14} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />;
}

function ProgressBar({ progress, status }: { progress: number; status: RoadmapPhase["status"] }) {
  const barColor =
    status === "completed"
      ? "#22c55e"
      : status === "active"
      ? "#4af3ff"
      : "rgba(255,255,255,0.15)";

  const fillColor =
    progress === 100
      ? "#22c55e"
      : progress > 0
      ? "linear-gradient(to right, #4af3ff, #22d3ee)"
      : "rgba(255,255,255,0.08)";

  return (
    <div style={{ position: "relative", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden", flex: 1 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${progress}%`,
          background:
            progress === 100
              ? "#22c55e"
              : "linear-gradient(to right, #4af3ff, #22d3ee)",
          borderRadius: 2,
          boxShadow: progress > 0 ? "0 0 6px rgba(74,243,255,0.4)" : "none",
          transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}

function PhaseCard({ phase, isLast }: { phase: RoadmapPhase; isLast: boolean }) {
  const isActive = phase.status === "active";
  const isCompleted = phase.status === "completed";

  const borderColor = isActive
    ? "rgba(74,243,255,0.25)"
    : isCompleted
    ? "rgba(34,197,94,0.2)"
    : "rgba(255,255,255,0.06)";

  const glowColor = isActive
    ? "rgba(74,243,255,0.04)"
    : "transparent";

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {/* Timeline spine */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        {/* Node */}
        <div style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: isCompleted
            ? "#22c55e"
            : isActive
            ? "rgba(74,243,255,0.15)"
            : "rgba(255,255,255,0.05)",
          border: isCompleted
            ? "2px solid #22c55e"
            : isActive
            ? "2px solid #4af3ff"
            : "2px solid rgba(255,255,255,0.12)",
          boxShadow: isActive
            ? "0 0 12px rgba(74,243,255,0.5), 0 0 24px rgba(74,243,255,0.2)"
            : isCompleted
            ? "0 0 8px rgba(34,197,94,0.4)"
            : "none",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 12,
        }}>
          {isCompleted && <CheckCircle2 size={10} style={{ color: "#fff" }} />}
          {isActive && (
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#4af3ff",
              boxShadow: "0 0 6px #4af3ff",
              animation: "pulse-dot 2s ease-in-out infinite",
            }} />
          )}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div style={{
            width: 1,
            flex: 1,
            marginTop: 4,
            background: isCompleted || isActive
              ? "linear-gradient(to bottom, rgba(74,243,255,0.2), rgba(74,243,255,0.05))"
              : "rgba(255,255,255,0.06)",
            minHeight: 32,
          }} />
        )}
      </div>

      {/* Phase card */}
      <div
        style={{
          flex: 1,
          marginBottom: isLast ? 0 : 20,
          padding: 20,
          borderRadius: 12,
          background: isActive
            ? "rgba(74,243,255,0.03)"
            : "rgba(255,255,255,0.02)",
          border: `1px solid ${borderColor}`,
          boxShadow: isActive
            ? `0 0 30px ${glowColor}, inset 0 0 0 1px rgba(74,243,255,0.05)`
            : "none",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 10,
                fontFamily: "'SF Mono', monospace",
                letterSpacing: "0.15em",
                color: isActive ? "#4af3ff" : "rgba(255,255,255,0.3)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}>
                Phase {phase.id}
              </span>
              {isActive && (
                <span style={{
                  fontSize: 9,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "rgba(74,243,255,0.1)",
                  border: "1px solid rgba(74,243,255,0.2)",
                  color: "#4af3ff",
                  fontFamily: "'SF Mono', monospace",
                  letterSpacing: "0.1em",
                }}>
                  ACTIVE
                </span>
              )}
            </div>
            <h3 style={{
              fontSize: 15,
              fontWeight: 600,
              color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)",
              margin: 0,
              letterSpacing: "0.01em",
            }}>
              {phase.title}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Calendar size={10} style={{ color: "rgba(255,255,255,0.25)" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'SF Mono', monospace" }}>
                {phase.dateRange}
              </span>
            </div>
          </div>

          {/* Progress circle */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "'SF Mono', monospace",
              color: phase.progress === 100
                ? "#22c55e"
                : phase.progress > 0
                ? "#4af3ff"
                : "rgba(255,255,255,0.2)",
              textShadow: phase.progress > 0 ? "0 0 12px rgba(74,243,255,0.4)" : "none",
              lineHeight: 1,
            }}>
              {phase.progress}%
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2, fontFamily: "'SF Mono', monospace" }}>
              {phase.taskCounts.done}/{phase.taskCounts.total} done
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <ProgressBar progress={phase.progress} status={phase.status} />
        </div>

        {/* Task list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {phase.tasks.map((task, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 0",
              }}
            >
              <TaskIcon status={task.status} />
              <span style={{
                fontSize: 12,
                color: task.status === "done"
                  ? "rgba(255,255,255,0.5)"
                  : task.status === "in-progress"
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(255,255,255,0.3)",
                textDecoration: task.status === "done" ? "line-through" : "none",
                textDecorationColor: "rgba(255,255,255,0.2)",
                letterSpacing: "0.01em",
              }}>
                {task.name}
              </span>
            </div>
          ))}
        </div>

        {/* Phase task summary badges */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {phase.taskCounts.done > 0 && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontFamily: "'SF Mono', monospace" }}>
              ✓ {phase.taskCounts.done} done
            </span>
          )}
          {phase.taskCounts.inProgress > 0 && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(74,243,255,0.08)", color: "#4af3ff", fontFamily: "'SF Mono', monospace" }}>
              ⟳ {phase.taskCounts.inProgress} in progress
            </span>
          )}
          {phase.taskCounts.notStarted > 0 && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", fontFamily: "'SF Mono', monospace" }}>
              ○ {phase.taskCounts.notStarted} pending
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Roadmap() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function load() {
    try {
      setError(null);
      const res = await fetch("/api/roadmap");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const overallProgress = data
    ? Math.round(data.phases.reduce((s, p) => s + p.progress, 0) / data.phases.length)
    : 0;

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "32px 24px 120px",
        background: "transparent",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>🗺️</span>
              <h1 style={{
                fontSize: 22,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}>
                Project Roadmap
              </h1>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0, fontFamily: "'SF Mono', monospace" }}>
              {data ? `Updated ${data.lastUpdated} · refreshed ${lastRefresh.toLocaleTimeString()}` : "Loading..."}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Overall progress */}
            {data && (
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <TrendingUp size={12} style={{ color: "#4af3ff" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'SF Mono', monospace", letterSpacing: "0.1em" }}>
                    OVERALL
                  </span>
                </div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: "'SF Mono', monospace",
                  color: "#4af3ff",
                  textShadow: "0 0 16px rgba(74,243,255,0.5)",
                  lineHeight: 1,
                }}>
                  {overallProgress}%
                </div>
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={load}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid rgba(74,243,255,0.15)",
                background: "rgba(74,243,255,0.05)",
                cursor: loading ? "default" : "pointer",
                color: "rgba(74,243,255,0.6)",
                outline: "none",
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
        </div>

        {/* Overall progress bar */}
        {data && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ProgressBar progress={overallProgress} status="active" />
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            padding: 16,
            borderRadius: 10,
            background: "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.15)",
            color: "rgba(239,68,68,0.8)",
            fontSize: 13,
            fontFamily: "'SF Mono', monospace",
            marginBottom: 24,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.25)" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 12, fontFamily: "'SF Mono', monospace" }}>Loading roadmap...</div>
          </div>
        )}

        {/* Phase timeline */}
        {data && !loading && (
          <div>
            {data.phases.map((phase, i) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                isLast={i === data.phases.length - 1}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        <div style={{
          marginTop: 32,
          padding: 12,
          borderRadius: 8,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          fontSize: 11,
          color: "rgba(255,255,255,0.2)",
          fontFamily: "'SF Mono', monospace",
          textAlign: "center",
        }}>
          Roadmap auto-updates every Friday at 6 PM via cron job
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
