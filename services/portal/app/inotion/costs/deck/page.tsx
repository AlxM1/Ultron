"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ─── Types ─────────────────────────────────────────────────── */

interface SlideContent {
  type: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  heading?: string;
  caption?: string;
  stats?: { label: string; value: string; color?: string; icon?: string }[];
  chartType?: string;
  chartData?: any[];
  chartConfig?: { dataKey: string; nameKey?: string; xKey?: string };
  headers?: string[];
  rows?: (string | number)[][];
  body?: string;
  bullets?: string[];
  left?: SlideContent;
  right?: SlideContent;
}

interface Slide {
  id: string;
  layout: string;
  bg?: string;
  content: SlideContent;
}

interface DeckData {
  title: string;
  subtitle?: string;
  date?: string;
  slides: Slide[];
}

/* ─── Theme: Dark + Amber ───────────────────────────────────── */

const AMBER = "#f59e0b";
const AMBER_DIM = "rgba(245,158,11,0.15)";
const AMBER_GLOW = "rgba(245,158,11,0.3)";
const BG = "#0a0a0f";
const BG_CARD = "rgba(255,255,255,0.04)";
const BG_GRAD = "linear-gradient(135deg, #0a0a0f 0%, #14141f 50%, #0d0d14 100%)";
const TEXT = "#e4e4e7";
const TEXT_DIM = "#71717a";
const CHART_COLORS = ["#f59e0b", "#fb923c", "#fbbf24", "#d97706", "#92400e", "#eab308", "#ca8a04", "#a16207"];

/* ─── Tooltip ───────────────────────────────────────────────── */

const DeckTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1a1a2e", border: `1px solid ${AMBER_DIM}`, borderRadius: 8,
      padding: "10px 14px", fontSize: 12,
    }}>
      <div style={{ color: TEXT_DIM, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: AMBER, fontWeight: 700, fontFamily: "monospace" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
};

/* ─── Chart Renderer ────────────────────────────────────────── */

function RenderChart({ content }: { content: SlideContent }) {
  const { chartType, chartData, chartConfig } = content;
  if (!chartData || !chartConfig) return null;

  const axisStyle = { fill: TEXT_DIM, fontSize: 10, fontFamily: "monospace" };

  return (
    <ResponsiveContainer width="100%" height={300}>
      {chartType === "pie" ? (
        <PieChart>
          <Pie data={chartData} dataKey={chartConfig.dataKey} nameKey={chartConfig.nameKey || "name"}
            cx="50%" cy="50%" outerRadius={120} innerRadius={60} strokeWidth={2} stroke={BG}
            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={{ stroke: TEXT_DIM }}
          >
            {chartData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<DeckTooltip />} />
        </PieChart>
      ) : chartType === "horizontal-bar" ? (
        <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" tick={axisStyle} stroke="rgba(255,255,255,0.05)" />
          <YAxis type="category" dataKey={chartConfig.nameKey || "name"} tick={axisStyle} stroke="rgba(255,255,255,0.05)" width={120} />
          <Tooltip content={<DeckTooltip />} />
          <Bar dataKey={chartConfig.dataKey} radius={[0, 4, 4, 0]}>
            {chartData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      ) : chartType === "bar" ? (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={chartConfig.xKey || "name"} tick={axisStyle} stroke="rgba(255,255,255,0.05)" />
          <YAxis tick={axisStyle} stroke="rgba(255,255,255,0.05)" />
          <Tooltip content={<DeckTooltip />} />
          <Bar dataKey={chartConfig.dataKey} radius={[4, 4, 0, 0]}>
            {chartData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      ) : (
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={AMBER} stopOpacity={0.3} />
              <stop offset="95%" stopColor={AMBER} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={chartConfig.xKey || "name"} tick={axisStyle} stroke="rgba(255,255,255,0.05)" />
          <YAxis tick={axisStyle} stroke="rgba(255,255,255,0.05)" />
          <Tooltip content={<DeckTooltip />} />
          <Area type="monotone" dataKey={chartConfig.dataKey} stroke={AMBER} fill="url(#amberGrad)"
            strokeWidth={2.5} dot={{ fill: AMBER, r: 3, strokeWidth: 2, stroke: BG }} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

/* ─── Content Renderer ──────────────────────────────────────── */

function RenderContent({ content }: { content: SlideContent }) {
  switch (content.type) {
    case "hero":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", gap: 24 }}>
          {content.badge && (
            <div style={{ fontSize: 11, fontWeight: 600, color: AMBER, padding: "6px 18px", background: AMBER_DIM, borderRadius: 20, letterSpacing: "0.1em", fontFamily: "monospace" }}>
              {content.badge}
            </div>
          )}
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.1, maxWidth: 800, letterSpacing: "-0.03em" }}>
            {content.title}
          </h1>
          {content.subtitle && (
            <p style={{ fontSize: 18, color: TEXT_DIM, margin: 0, maxWidth: 640, lineHeight: 1.7 }}>
              {content.subtitle}
            </p>
          )}
        </div>
      );

    case "stats":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {content.heading && <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, textAlign: "center" }}>{content.heading}</h2>}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
            {content.stats?.map((s, i) => (
              <div key={i} style={{
                background: BG_CARD, border: `1px solid rgba(245,158,11,0.12)`,
                borderRadius: 16, padding: "28px 36px", flex: 1, minWidth: 180, maxWidth: 260,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: s.color || AMBER, fontFamily: "monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>
          {content.caption && <div style={{ textAlign: "center", fontSize: 12, color: TEXT_DIM, fontFamily: "monospace" }}>{content.caption}</div>}
        </div>
      );

    case "chart":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {content.heading && <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>{content.heading}</h2>}
          <div style={{ background: BG_CARD, borderRadius: 16, padding: "20px 12px", border: `1px solid rgba(255,255,255,0.06)` }}>
            <RenderChart content={content} />
          </div>
          {content.caption && <div style={{ fontSize: 12, color: TEXT_DIM, fontFamily: "monospace" }}>{content.caption}</div>}
        </div>
      );

    case "table":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {content.heading && <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>{content.heading}</h2>}
          <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "monospace" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  {content.headers?.map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "12px 18px", color: AMBER, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.rows?.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: "10px 18px", color: ci === 0 ? TEXT : TEXT_DIM }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "text":
      return (
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {content.heading && <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 20px" }}>{content.heading}</h2>}
          {content.bullets && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {content.bullets.map((b, i) => (
                <li key={i} style={{ padding: "10px 0", fontSize: 15, color: TEXT, display: "flex", alignItems: "flex-start", gap: 14, lineHeight: 1.6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: AMBER, marginTop: 9, flexShrink: 0 }} />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      );

    case "split":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, height: "100%", alignItems: "center" }}>
          <div>{content.left && <RenderContent content={content.left} />}</div>
          <div>{content.right && <RenderContent content={content.right} />}</div>
        </div>
      );

    default:
      return null;
  }
}

/* ─── Slide ─────────────────────────────────────────────────── */

function SlideView({ slide, index, total }: { slide: Slide; index: number; total: number }) {
  const isGrad = slide.bg === "gradient";
  const bg = isGrad
    ? "linear-gradient(135deg, #0f0f1a 0%, #1a1020 50%, #0f0f1a 100%)"
    : BG_GRAD;

  return (
    <div style={{
      background: bg, width: "100%", height: "100%", position: "relative",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: slide.layout === "cover" ? "60px 100px" : "48px 80px",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "-20%", right: "-10%", width: 400, height: 400,
        borderRadius: "50%", background: AMBER_GLOW, filter: "blur(120px)",
        opacity: 0.08, pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <RenderContent content={slide.content} />
      </div>

      <div style={{
        position: "absolute", bottom: 24, right: 40,
        fontSize: 11, fontWeight: 500, color: TEXT_DIM, fontFamily: "monospace",
      }}>
        {index + 1} / {total}
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */

export default function CostDeckPage() {
  const [deck, setDeck] = useState<DeckData | null>(null);
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/deck/costs").then(r => r.json()).then(d => {
      if (!d.error) setDeck(d);
    }).catch(console.error);
  }, []);

  // Auto-refresh every 5min
  useEffect(() => {
    const t = setInterval(() => {
      fetch("/api/deck/costs").then(r => r.json()).then(d => {
        if (!d.error) setDeck(d);
      }).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const total = deck?.slides.length || 0;
  const next = useCallback(() => setCurrent(s => Math.min(s + 1, total - 1)), [total]);
  const prev = useCallback(() => setCurrent(s => Math.max(s - 1, 0)), []);

  // Keyboard + scroll navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "f" || e.key === "F11") {
        e.preventDefault();
        if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
        else document.exitFullscreen();
      }
      if (e.key === "p") setAutoPlay(a => !a);
      if (e.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 30) {
        e.preventDefault();
        e.deltaY > 0 ? next() : prev();
      }
    };
    window.addEventListener("keydown", onKey);
    const el = containerRef.current;
    el?.addEventListener("wheel", onWheel, { passive: false });
    return () => { window.removeEventListener("keydown", onKey); el?.removeEventListener("wheel", onWheel); };
  }, [next, prev]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => setCurrent(s => (s + 1) % total), 10000);
    return () => clearInterval(t);
  }, [autoPlay, total]);

  if (!deck) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG, color: AMBER, fontFamily: "monospace", fontSize: 14 }}>
        Loading cost deck...
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: BG, fontFamily: "'Inter', -apple-system, sans-serif", overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.4)", flexShrink: 0, backdropFilter: "blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: AMBER, boxShadow: `0 0 8px ${AMBER_GLOW}` }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{deck.title}</span>
          {deck.date && <span style={{ fontSize: 11, color: TEXT_DIM, fontFamily: "monospace" }}>{deck.date}</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setAutoPlay(a => !a)} style={{
            background: autoPlay ? AMBER_DIM : "transparent", border: `1px solid ${autoPlay ? AMBER : "rgba(255,255,255,0.1)"}`,
            borderRadius: 8, padding: "5px 14px", color: autoPlay ? AMBER : TEXT_DIM,
            fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "monospace",
          }}>
            {autoPlay ? "PRESENTING" : "PRESENT"}
          </button>
          <button onClick={() => containerRef.current?.requestFullscreen()} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "5px 14px", color: TEXT_DIM,
            fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "monospace",
          }}>
            FULLSCREEN
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", gap: 2, padding: "6px 24px", flexShrink: 0 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} onClick={() => setCurrent(i)} style={{
            flex: 1, height: 3, borderRadius: 2, cursor: "pointer",
            background: i <= current ? AMBER : "rgba(255,255,255,0.06)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      {/* Slide area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {deck.slides.map((slide, i) => (
          <div key={slide.id} style={{
            position: "absolute", inset: 0,
            opacity: i === current ? 1 : 0,
            transform: i === current ? "scale(1)" : "scale(0.98)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
            pointerEvents: i === current ? "auto" : "none",
          }}>
            <SlideView slide={slide} index={i} total={total} />
          </div>
        ))}

        {/* Nav arrows */}
        {current > 0 && (
          <button onClick={prev} style={{
            position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: "50%", width: 44, height: 44, cursor: "pointer", color: AMBER,
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10, backdropFilter: "blur(4px)",
          }}>&#8592;</button>
        )}
        {current < total - 1 && (
          <button onClick={next} style={{
            position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
            background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: "50%", width: 44, height: 44, cursor: "pointer", color: AMBER,
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10, backdropFilter: "blur(4px)",
          }}>&#8594;</button>
        )}
      </div>

      {/* Thumbnail strip */}
      <div style={{
        display: "flex", gap: 4, padding: "6px 24px 10px",
        borderTop: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", flexShrink: 0,
      }}>
        {deck.slides.map((slide, i) => (
          <button key={slide.id} onClick={() => setCurrent(i)} style={{
            flexShrink: 0, width: 64, height: 38, borderRadius: 6,
            background: i === current ? AMBER_DIM : "rgba(255,255,255,0.03)",
            border: `2px solid ${i === current ? AMBER : "transparent"}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: i === current ? AMBER : TEXT_DIM, fontFamily: "monospace" }}>
              {i + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
