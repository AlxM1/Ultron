"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ─── Types ───────────────────────────────────────────────────── */

interface SlideContent {
  type: "hero" | "stats" | "chart" | "table" | "text" | "split" | "quote";
  title?: string;
  subtitle?: string;
  badge?: string;
  stats?: { label: string; value: string; sub?: string; color?: string; icon?: string }[];
  chartType?: "area" | "bar" | "pie" | "horizontal-bar";
  chartData?: any[];
  chartConfig?: { dataKey: string; nameKey?: string; colors?: string[]; xKey?: string };
  headers?: string[];
  rows?: (string | number)[][];
  body?: string;
  bullets?: string[];
  left?: SlideContent;
  right?: SlideContent;
  caption?: string;
  heading?: string;
}

interface Slide {
  id: string;
  layout: "cover" | "content" | "section" | "end";
  bg?: "light" | "dark" | "accent";
  content: SlideContent;
}

interface DeckData {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  slides: Slide[];
}

/* ─── Theme ───────────────────────────────────────────────────── */

const T = {
  bg: "#ffffff",
  bgAlt: "#f8f9fc",
  bgDark: "#0f172a",
  text: "#1e293b",
  textLight: "#64748b",
  textMuted: "#94a3b8",
  accent: "#2563eb",
  accentLight: "#3b82f6",
  accentBg: "#eff6ff",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  success: "#10b981",
  chart: ["#2563eb", "#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"],
};

/* ─── Utilities ───────────────────────────────────────────────── */

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8,
      padding: "10px 14px", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      <div style={{ color: T.textLight, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || T.accent, fontWeight: 600 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

/* ─── Slide Content Renderers ─────────────────────────────────── */

function RenderChart({ content }: { content: SlideContent }) {
  const { chartType, chartData, chartConfig } = content;
  if (!chartData || !chartConfig) return null;
  const colors = chartConfig.colors || T.chart;

  return (
    <ResponsiveContainer width="100%" height={340}>
      {chartType === "pie" ? (
        <PieChart>
          <Pie data={chartData} dataKey={chartConfig.dataKey} nameKey={chartConfig.nameKey || "name"}
            cx="50%" cy="50%" outerRadius={130} innerRadius={70} strokeWidth={2} stroke="#fff"
            label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={{ stroke: T.textMuted }}
          >
            {chartData.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      ) : chartType === "horizontal-bar" ? (
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} />
          <XAxis type="number" tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.borderLight} />
          <YAxis type="category" dataKey={chartConfig.nameKey || "name"} tick={{ fill: T.textLight, fontSize: 12 }} stroke={T.borderLight} width={130} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey={chartConfig.dataKey} radius={[0, 6, 6, 0]}>
            {chartData.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Bar>
        </BarChart>
      ) : chartType === "bar" ? (
        <BarChart data={chartData} margin={{ top: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} />
          <XAxis dataKey={chartConfig.xKey || "name"} tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.borderLight} />
          <YAxis tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.borderLight} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey={chartConfig.dataKey} radius={[6, 6, 0, 0]}>
            {chartData.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Bar>
        </BarChart>
      ) : (
        <AreaChart data={chartData} margin={{ top: 10 }}>
          <defs>
            <linearGradient id="deckAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={T.accent} stopOpacity={0.15} />
              <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} />
          <XAxis dataKey={chartConfig.xKey || "name"} tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.borderLight} />
          <YAxis tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.borderLight} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey={chartConfig.dataKey} stroke={T.accent} fill="url(#deckAreaGrad)" strokeWidth={2.5} dot={{ fill: T.accent, r: 4, strokeWidth: 2, stroke: "#fff" }} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

function RenderTable({ content }: { content: SlideContent }) {
  if (!content.headers || !content.rows) return null;
  return (
    <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${T.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: T.bgAlt }}>
            {content.headers.map((h, i) => (
              <th key={i} style={{ textAlign: "left", padding: "14px 20px", color: T.textLight, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: `2px solid ${T.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: ri < content.rows!.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "12px 20px", color: ci === 0 ? T.text : T.textLight, fontWeight: ci === 0 ? 500 : 400 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RenderStats({ stats }: { stats: SlideContent["stats"] }) {
  if (!stats) return null;
  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          background: "#fff", border: `1px solid ${T.border}`,
          borderRadius: 16, padding: "32px 40px", flex: 1, minWidth: 200, maxWidth: 280,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.04)",
          textAlign: "center", transition: "transform 0.2s, box-shadow 0.2s",
        }}>
          {s.icon && <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>}
          <div style={{ fontSize: 12, fontWeight: 500, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{s.label}</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: s.color || T.accent, letterSpacing: "-0.02em" }}>{s.value}</div>
          {s.sub && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function RenderContent({ content }: { content: SlideContent }) {
  switch (content.type) {
    case "hero":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", gap: 20 }}>
          {content.badge && (
            <div style={{ fontSize: 12, fontWeight: 600, color: T.accent, padding: "6px 16px", background: T.accentBg, borderRadius: 20, letterSpacing: "0.05em" }}>
              {content.badge}
            </div>
          )}
          <h1 style={{ fontSize: 56, fontWeight: 800, color: T.bgDark, margin: 0, lineHeight: 1.1, maxWidth: 800, letterSpacing: "-0.03em" }}>
            {content.title}
          </h1>
          {content.subtitle && (
            <p style={{ fontSize: 20, color: T.textLight, margin: 0, maxWidth: 640, lineHeight: 1.7, fontWeight: 400 }}>
              {content.subtitle}
            </p>
          )}
        </div>
      );

    case "stats":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {content.heading && <h2 style={{ fontSize: 32, fontWeight: 700, color: T.bgDark, margin: 0, textAlign: "center", letterSpacing: "-0.02em" }}>{content.heading}</h2>}
          <RenderStats stats={content.stats} />
          {content.caption && <div style={{ textAlign: "center", fontSize: 13, color: T.textMuted }}>{content.caption}</div>}
        </div>
      );

    case "chart":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {content.heading && <h2 style={{ fontSize: 28, fontWeight: 700, color: T.bgDark, margin: 0, letterSpacing: "-0.02em" }}>{content.heading}</h2>}
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px 16px", border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <RenderChart content={content} />
          </div>
          {content.caption && <div style={{ fontSize: 13, color: T.textMuted }}>{content.caption}</div>}
        </div>
      );

    case "table":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {content.heading && <h2 style={{ fontSize: 28, fontWeight: 700, color: T.bgDark, margin: 0, letterSpacing: "-0.02em" }}>{content.heading}</h2>}
          <RenderTable content={content} />
        </div>
      );

    case "text":
      return (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {content.heading && <h2 style={{ fontSize: 32, fontWeight: 700, color: T.bgDark, margin: "0 0 20px", letterSpacing: "-0.02em" }}>{content.heading}</h2>}
          {content.body && <p style={{ fontSize: 18, color: T.textLight, lineHeight: 1.8 }}>{content.body}</p>}
          {content.bullets && (
            <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 0" }}>
              {content.bullets.map((b, i) => (
                <li key={i} style={{ padding: "10px 0", fontSize: 16, color: T.text, display: "flex", alignItems: "flex-start", gap: 14, lineHeight: 1.6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, marginTop: 9, flexShrink: 0 }} />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      );

    case "split":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, height: "100%", alignItems: "center" }}>
          <div>{content.left && <RenderContent content={content.left} />}</div>
          <div>{content.right && <RenderContent content={content.right} />}</div>
        </div>
      );

    case "quote":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 72, color: T.accent, opacity: 0.2, lineHeight: 1, fontFamily: "Georgia, serif" }}>"</div>
          <blockquote style={{ fontSize: 28, fontWeight: 400, color: T.bgDark, margin: "0 0 16px", maxWidth: 700, lineHeight: 1.6, fontStyle: "italic" }}>
            {content.body}
          </blockquote>
          {content.caption && <div style={{ fontSize: 15, color: T.textLight, fontWeight: 500 }}>— {content.caption}</div>}
        </div>
      );

    default:
      return null;
  }
}

/* ─── Slide View ──────────────────────────────────────────────── */

function SlideView({ slide, index, total, isActive }: { slide: Slide; index: number; total: number; isActive: boolean }) {
  const isDark = slide.bg === "dark";
  const isAccent = slide.bg === "accent";

  const bgStyle: React.CSSProperties = isDark
    ? { background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }
    : isAccent
    ? { background: `linear-gradient(135deg, ${T.accent} 0%, #7c3aed 100%)` }
    : { background: T.bgAlt };

  // Override text colors for dark/accent slides
  const textOverride: React.CSSProperties = (isDark || isAccent) ? { filter: "invert(1) hue-rotate(180deg)" } : {};

  return (
    <div style={{
      ...bgStyle,
      width: "100%", height: "100%", position: "relative",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: slide.layout === "cover" ? "60px 100px" : "48px 80px",
      opacity: isActive ? 1 : 0,
      transform: isActive ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.4s ease, transform 0.4s ease",
      overflow: "hidden",
    }}>
      {/* Subtle dot pattern */}
      {!isDark && !isAccent && (
        <div style={{
          position: "absolute", inset: 0, opacity: 0.4,
          backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
          backgroundSize: "24px 24px", pointerEvents: "none",
        }} />
      )}

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <RenderContent content={slide.content} />
      </div>

      {/* Slide counter */}
      <div style={{
        position: "absolute", bottom: 28, right: 40,
        fontSize: 12, fontWeight: 500,
        color: isDark || isAccent ? "rgba(255,255,255,0.3)" : T.textMuted,
      }}>
        {index + 1} / {total}
      </div>
    </div>
  );
}

/* ─── Progress Bar ────────────────────────────────────────────── */

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 3, padding: "0 40px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i <= current ? T.accent : T.border,
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

/* ─── Main Deck Component ─────────────────────────────────────── */

interface GammaDeckProps {
  deck?: DeckData;
  apiUrl?: string;
}

export default function GammaDeck({ deck: propDeck, apiUrl }: GammaDeckProps) {
  const [deck, setDeck] = useState<DeckData | null>(propDeck || null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propDeck) { setDeck(propDeck); return; }
    if (!apiUrl) return;
    fetch(apiUrl).then(r => r.json()).then(d => setDeck(d)).catch(console.error);
  }, [apiUrl, propDeck]);

  useEffect(() => {
    if (!apiUrl) return;
    const t = setInterval(() => {
      fetch(apiUrl).then(r => r.json()).then(d => setDeck(d)).catch(console.error);
    }, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [apiUrl]);

  const total = deck?.slides.length || 0;
  const next = useCallback(() => setCurrentSlide(s => Math.min(s + 1, total - 1)), [total]);
  const prev = useCallback(() => setCurrentSlide(s => Math.max(s - 1, 0)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "f" || e.key === "F11") { e.preventDefault(); if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); }
      if (e.key === "p") setAutoPlay(a => !a);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => setCurrentSlide(s => (s + 1) % total), 12000);
    return () => clearInterval(t);
  }, [autoPlay, total]);

  if (!deck) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: T.bgAlt, color: T.textLight }}>
        Loading presentation...
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ height: "100%", display: "flex", flexDirection: "column", background: T.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 24px", borderBottom: `1px solid ${T.border}`,
        background: "#fff", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{deck.title}</span>
          {deck.date && <span style={{ fontSize: 12, color: T.textMuted }}>· {deck.date}</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setAutoPlay(a => !a)} style={{
            background: autoPlay ? T.accentBg : "#fff", border: `1px solid ${autoPlay ? T.accent : T.border}`,
            borderRadius: 8, padding: "6px 14px", color: autoPlay ? T.accent : T.textLight,
            fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
          }}>
            {autoPlay ? "⏸ Presenting" : "▶ Present"}
          </button>
          <button onClick={() => containerRef.current?.requestFullscreen()} style={{
            background: "#fff", border: `1px solid ${T.border}`,
            borderRadius: 8, padding: "6px 14px", color: T.textLight,
            fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}>
            ⛶ Fullscreen
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ flexShrink: 0, padding: "8px 0 4px" }}>
        <ProgressBar current={currentSlide} total={total} />
      </div>

      {/* Slide area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {deck.slides.map((slide, i) => (
          <div key={slide.id} style={{
            position: "absolute", inset: 0,
            display: i === currentSlide ? "block" : "none",
          }}>
            <SlideView slide={slide} index={i} total={total} isActive={i === currentSlide} />
          </div>
        ))}

        {/* Nav arrows */}
        {currentSlide > 0 && (
          <button onClick={prev} style={{
            position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: "50%",
            width: 44, height: 44, cursor: "pointer", color: T.text, fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)", zIndex: 10, transition: "transform 0.2s",
          }}>←</button>
        )}
        {currentSlide < total - 1 && (
          <button onClick={next} style={{
            position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: "50%",
            width: 44, height: 44, cursor: "pointer", color: T.text, fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)", zIndex: 10, transition: "transform 0.2s",
          }}>→</button>
        )}
      </div>

      {/* Thumbnails */}
      <div style={{
        display: "flex", gap: 6, padding: "8px 24px 12px",
        borderTop: `1px solid ${T.border}`, overflowX: "auto", flexShrink: 0, background: "#fff",
      }}>
        {deck.slides.map((slide, i) => (
          <button key={slide.id} onClick={() => setCurrentSlide(i)} style={{
            flexShrink: 0, width: 72, height: 44, borderRadius: 8,
            background: i === currentSlide ? T.accentBg : T.bgAlt,
            border: `2px solid ${i === currentSlide ? T.accent : "transparent"}`,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: i === currentSlide ? T.accent : T.textMuted }}>
              {i + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
