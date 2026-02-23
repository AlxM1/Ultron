"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Service } from "../services";
import { fetchServiceStats, fetchTimeline, ServiceStats, Task } from "../lib/api";

type PageView = "home" | "services" | "content-intel" | "timeline" | "workflows" | "costs";

interface DashboardProps {
  services: Service[];
  healthStatus: Record<string, boolean>;
  onSelect: (id: string) => void;
  onNavigate: (page: PageView) => void;
  bootComplete: boolean;
}

/* ─── Interactive Arc Reactor ─────────────────────────────────── */
function InteractiveArcReactor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [velocity, setVelocity] = useState(0);
  const [clicks, setClicks] = useState(0);
  const lastPos = useRef({ x: 0.5, y: 0.5 });
  const lastTime = useRef(Date.now());
  const velocityDecay = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const now = Date.now();
    const dt = Math.max(now - lastTime.current, 1);
    const dx = x - lastPos.current.x;
    const dy = y - lastPos.current.y;
    const speed = Math.sqrt(dx * dx + dy * dy) / dt * 1000;

    setMousePos({ x, y });
    setVelocity(Math.min(speed * 3, 1));
    lastPos.current = { x, y };
    lastTime.current = now;

    // Decay velocity
    if (velocityDecay.current) cancelAnimationFrame(velocityDecay.current);
    const decay = () => {
      setVelocity(v => {
        const next = v * 0.95;
        if (next > 0.01) {
          velocityDecay.current = requestAnimationFrame(decay);
        }
        return next;
      });
    };
    velocityDecay.current = requestAnimationFrame(decay);
  }, []);

  const handleClick = useCallback(() => {
    setClicks(c => c + 1);
    setVelocity(1);
    setTimeout(() => setClicks(c => Math.max(c - 1, 0)), 600);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("click", handleClick);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("click", handleClick);
      if (velocityDecay.current) cancelAnimationFrame(velocityDecay.current);
    };
  }, [handleMouseMove, handleClick]);

  // Derived intensity values
  const intensity = velocity;
  const coreGlow = 0.15 + intensity * 0.85;
  const ringBrightness = 0.08 + intensity * 0.4;
  const pulseSpeed = 3 - intensity * 2; // Faster when moving
  const rotateSpeed = 30 - intensity * 20; // Faster rotation when moving
  const ambientSize = 60 + intensity * 30;
  const clickFlash = clicks > 0;

  // Parallax offset based on mouse position
  const parallaxX = (mousePos.x - 0.5) * 20;
  const parallaxY = (mousePos.y - 0.5) * 20;

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        cursor: "crosshair",
        zIndex: 1,
      }}
    >
      {/* Ambient glow - reacts to movement */}
      <div style={{
        position: "absolute",
        top: "40%",
        left: "50%",
        transform: `translate(calc(-50% + ${parallaxX * 0.5}px), calc(-50% + ${parallaxY * 0.5}px))`,
        width: `${ambientSize}vw`,
        height: `${ambientSize}vh`,
        background: `radial-gradient(ellipse, rgba(74,243,255,${0.03 + intensity * 0.08}) 0%, transparent 60%)`,
        pointerEvents: "none",
        transition: "width 0.3s, height 0.3s",
      }} />

      {/* Click flash burst */}
      {clickFlash && (
        <div style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80vw",
          height: "80vh",
          background: "radial-gradient(ellipse, rgba(74,243,255,0.15) 0%, transparent 50%)",
          pointerEvents: "none",
          animation: "flash-burst 0.6s ease-out forwards",
        }} />
      )}

      {/* Reactor SVG */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(calc(-50% + ${parallaxX}px), calc(-55% + ${parallaxY}px))`,
        width: "min(50vw, 50vh)",
        height: "min(50vw, 50vh)",
        pointerEvents: "none",
        transition: "transform 0.1s ease-out",
        filter: `drop-shadow(0 0 ${20 + intensity * 60}px rgba(74,243,255,${0.1 + intensity * 0.3}))`,
      }}>
        <svg viewBox="0 0 400 400" width="100%" height="100%">
          {/* Outermost ring */}
          <circle cx="200" cy="200" r="195" fill="none" stroke={`rgba(74,243,255,${0.06 + intensity * 0.12})`} strokeWidth="0.5" />

          {/* Outer rotating ring - speed reacts to mouse */}
          <g style={{ transformOrigin: "200px 200px", animation: `ring-rotate ${rotateSpeed}s linear infinite` }}>
            <circle cx="200" cy="200" r="180" fill="none" stroke={`rgba(74,243,255,${ringBrightness})`} strokeWidth={1 + intensity * 1.5} strokeDasharray="8 16" />
          </g>

          {/* Second ring - counter rotate */}
          <g style={{ transformOrigin: "200px 200px", animation: `ring-rotate-reverse ${rotateSpeed * 0.85}s linear infinite` }}>
            <circle cx="200" cy="200" r="155" fill="none" stroke={`rgba(74,243,255,${ringBrightness * 1.2})`} strokeWidth={1 + intensity} strokeDasharray="20 10" />
          </g>

          {/* Third ring */}
          <g style={{ transformOrigin: "200px 200px", animation: `ring-rotate ${rotateSpeed * 0.7}s linear infinite` }}>
            <circle cx="200" cy="200" r="130" fill="none" stroke={`rgba(74,243,255,${ringBrightness * 1.4})`} strokeWidth={1.5 + intensity} strokeDasharray="4 8" />
          </g>

          {/* Inner structural ring - pulses with intensity */}
          <circle cx="200" cy="200" r="105" fill="none" stroke={`rgba(74,243,255,${0.15 + intensity * 0.35})`} strokeWidth={1 + intensity * 0.5} />

          {/* Hexagonal housing segments - glow with movement */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <g key={deg} style={{ transformOrigin: "200px 200px", transform: `rotate(${deg}deg)` }}>
              <rect
                x="188" y="100" width="24" height="10" rx="2"
                fill={`rgba(74,243,255,${0.08 + intensity * 0.2})`}
                stroke={`rgba(74,243,255,${0.15 + intensity * 0.35})`}
                strokeWidth="0.5"
              />
            </g>
          ))}

          {/* Inner glow ring */}
          <circle cx="200" cy="200" r="80" fill={`rgba(74,243,255,${0.02 + intensity * 0.04})`} stroke={`rgba(74,243,255,${0.2 + intensity * 0.4})`} strokeWidth={2 + intensity} />

          {/* Outer hexagon */}
          <polygon
            points="200,145 248,190 248,235 200,260 152,235 152,190"
            fill="none"
            stroke={`rgba(74,243,255,${0.12 + intensity * 0.25})`}
            strokeWidth={1 + intensity * 0.5}
          />

          {/* Inner hexagon */}
          <polygon
            points="200,160 235,195 235,225 200,245 165,225 165,195"
            fill="none"
            stroke={`rgba(74,243,255,${0.18 + intensity * 0.3})`}
            strokeWidth={1 + intensity * 0.5}
          />

          {/* Core chambers */}
          <circle cx="200" cy="200" r="45" fill={`rgba(74,243,255,${0.03 + intensity * 0.06})`} stroke={`rgba(74,243,255,${0.25 + intensity * 0.35})`} strokeWidth={1.5 + intensity} />
          <circle cx="200" cy="200" r="25" fill={`rgba(74,243,255,${0.05 + intensity * 0.1})`} stroke={`rgba(74,243,255,${0.35 + intensity * 0.4})`} strokeWidth={1 + intensity * 0.5} />

          {/* Pulsing core - faster when moving */}
          <circle cx="200" cy="200" r="12" fill={`rgba(74,243,255,${coreGlow})`} style={{ animation: `arc-reactor-pulse ${pulseSpeed}s ease-in-out infinite` }}>
            <animate attributeName="r" values={`${10 + intensity * 4};${14 + intensity * 6};${10 + intensity * 4}`} dur={`${pulseSpeed}s`} repeatCount="indefinite" />
          </circle>
          <circle cx="200" cy="200" r={6 + intensity * 3} fill={`rgba(74,243,255,${0.4 + intensity * 0.5})`} />
          <circle cx="200" cy="200" r={3 + intensity * 2} fill="#4af3ff" style={{ filter: `blur(${1 + intensity * 2}px)` }} />

          {/* Energy particles - appear with movement */}
          {intensity > 0.1 && [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
            const dist = 60 + Math.sin(Date.now() / 500 + i) * 15;
            const rad = (deg * Math.PI) / 180;
            const px = 200 + Math.cos(rad) * dist;
            const py = 200 + Math.sin(rad) * dist;
            return (
              <circle
                key={deg}
                cx={px} cy={py}
                r={1 + intensity * 1.5}
                fill={`rgba(74,243,255,${intensity * 0.6})`}
                style={{ animation: `arc-reactor-pulse ${1 + i * 0.2}s ease-in-out infinite` }}
              />
            );
          })}

          {/* Radial glow */}
          <defs>
            <radialGradient id="reactorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={`rgba(74,243,255,${0.08 + intensity * 0.15})`} />
              <stop offset="40%" stopColor={`rgba(74,243,255,${0.03 + intensity * 0.05})`} />
              <stop offset="100%" stopColor="rgba(74,243,255,0)" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="200" r="190" fill="url(#reactorGlow)" />

          {/* Tick marks */}
          {Array.from({ length: 72 }).map((_, i) => {
            const deg = i * 5;
            const len = i % 6 === 0 ? 8 : 3;
            const opacity = (i % 6 === 0 ? 0.2 : 0.08) + intensity * 0.15;
            return (
              <line
                key={i}
                x1="200" y1={10}
                x2="200" y2={10 + len}
                stroke={`rgba(74,243,255,${opacity})`}
                strokeWidth="0.5"
                style={{ transformOrigin: "200px 200px", transform: `rotate(${deg}deg)` }}
              />
            );
          })}
        </svg>
      </div>

      {/* Mouse trail particles */}
      {intensity > 0.15 && (
        <div style={{
          position: "absolute",
          left: `${mousePos.x * 100}%`,
          top: `${mousePos.y * 100}%`,
          transform: "translate(-50%, -50%)",
          width: 4 + intensity * 8,
          height: 4 + intensity * 8,
          borderRadius: "50%",
          background: `rgba(74,243,255,${intensity * 0.3})`,
          boxShadow: `0 0 ${10 + intensity * 20}px rgba(74,243,255,${intensity * 0.4})`,
          pointerEvents: "none",
          transition: "width 0.15s, height 0.15s, left 0.05s, top 0.05s",
        }} />
      )}

      {/* Crosshair at mouse position - subtle */}
      {intensity > 0.05 && (
        <svg
          style={{
            position: "absolute",
            left: `${mousePos.x * 100}%`,
            top: `${mousePos.y * 100}%`,
            transform: "translate(-50%, -50%)",
            width: 24,
            height: 24,
            pointerEvents: "none",
            opacity: intensity * 0.5,
            transition: "left 0.05s, top 0.05s",
          }}
          viewBox="0 0 24 24"
        >
          <line x1="12" y1="2" x2="12" y2="8" stroke="#4af3ff" strokeWidth="0.5" />
          <line x1="12" y1="16" x2="12" y2="22" stroke="#4af3ff" strokeWidth="0.5" />
          <line x1="2" y1="12" x2="8" y2="12" stroke="#4af3ff" strokeWidth="0.5" />
          <line x1="16" y1="12" x2="22" y2="12" stroke="#4af3ff" strokeWidth="0.5" />
        </svg>
      )}
    </div>
  );
}

/* ─── Status text at bottom ───────────────────────────────────── */
function StatusLine({ healthStatus, services }: { healthStatus: Record<string, boolean>; services: Service[] }) {
  const displayServices = services.filter(s => s.id !== "settings");
  const online = Object.values(healthStatus).filter(Boolean).length;
  const total = displayServices.length;
  const isLoading = Object.keys(healthStatus).length === 0;

  return (
    <div style={{
      position: "absolute",
      bottom: 100,
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      alignItems: "center",
      gap: 24,
      opacity: 0.5,
      zIndex: 2,
    }}>
      <div style={{
        fontSize: 10,
        fontFamily: "'SF Mono', monospace",
        letterSpacing: "0.15em",
        color: "rgba(74,243,255,0.6)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: isLoading ? "#f59e0b" : online === total ? "#22c55e" : "#ef4444",
          boxShadow: isLoading ? "0 0 4px #f59e0b" : online === total ? "0 0 6px #22c55e" : "0 0 4px #ef4444",
          animation: "status-online 2s ease-in-out infinite",
        }} />
        {isLoading ? "CHECKING SYSTEMS..." : `${online}/${total} SYSTEMS ONLINE`}
      </div>
      <div style={{
        width: 1,
        height: 12,
        background: "rgba(74,243,255,0.15)",
      }} />
      <div style={{
        fontSize: 10,
        fontFamily: "'SF Mono', monospace",
        letterSpacing: "0.15em",
        color: "rgba(74,243,255,0.4)",
      }}>
        JARVIS v4.6.2
      </div>
    </div>
  );
}

/* ─── Dashboard (Minimal + Interactive) ───────────────────────── */
export default function Dashboard({
  services,
  healthStatus,
  onSelect,
  onNavigate,
  bootComplete,
}: DashboardProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      height: "100%",
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(135deg, #000008 0%, #000510 50%, #000308 100%)",
    }}>
      {/* Hex grid background */}
      <div className="hex-grid-bg" style={{ position: "absolute", inset: 0, zIndex: 0 }} />

      {/* Scan line */}
      <div className="scanline-overlay" style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }} />

      {/* Interactive Arc Reactor - responds to mouse */}
      <InteractiveArcReactor />

      {/* Clock - top right, subtle */}
      <div style={{
        position: "absolute",
        top: 16,
        right: 24,
        zIndex: 4,
        textAlign: "right",
        opacity: 0.6,
        pointerEvents: "none",
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 600,
          fontFamily: "'SF Mono', monospace",
          color: "#4af3ff",
          textShadow: "0 0 8px rgba(74,243,255,0.4)",
          letterSpacing: "0.1em",
        }}>
          {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
        <div style={{
          fontSize: 9,
          color: "rgba(74,243,255,0.35)",
          fontFamily: "'SF Mono', monospace",
          letterSpacing: "0.15em",
        }}>
          {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}
        </div>
      </div>

      {/* Status line above dock */}
      <StatusLine healthStatus={healthStatus} services={services} />
    </div>
  );
}
