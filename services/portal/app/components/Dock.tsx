"use client";

import { useState, useRef, useCallback } from "react";
import { Service } from "../services";

interface DockProps {
  services: Service[];
  activeApp: string | null;
  onSelect: (id: string) => void;
  healthStatus: Record<string, boolean>;
}

const BASE_SIZE = 52;
const MAX_SIZE = 80;
const MAGNIFY_RADIUS = 120; // px radius for magnification effect

export default function Dock({ services, activeApp, onSelect, healthStatus }: DockProps) {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseX(null);
  }, []);

  // Compute scale for each item based on mouse distance
  const getScale = (itemX: number, itemW: number) => {
    if (mouseX === null) return 1;
    const center = itemX + itemW / 2;
    const dist = Math.abs(mouseX - center);
    if (dist > MAGNIFY_RADIUS) return 1;
    const factor = 1 - dist / MAGNIFY_RADIUS;
    return 1 + factor * ((MAX_SIZE / BASE_SIZE) - 1);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
      }}
    >
      {/* Dock container */}
      <div
        ref={dockRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          padding: "8px 14px 10px",
          background: "rgba(0, 8, 20, 0.72)",
          backdropFilter: "blur(40px) saturate(200%)",
          WebkitBackdropFilter: "blur(40px) saturate(200%)",
          border: "1px solid rgba(74, 243, 255, 0.12)",
          borderRadius: 24,
          boxShadow: `
            0 8px 40px rgba(0, 0, 0, 0.7),
            0 0 0 1px rgba(74, 243, 255, 0.04) inset,
            0 0 30px rgba(74, 243, 255, 0.04)
          `,
          position: "relative",
        }}
      >
        {/* Top glow line */}
        <div style={{
          position: "absolute",
          top: 0,
          left: "20%",
          right: "20%",
          height: 1,
          background: "linear-gradient(to right, transparent, rgba(74,243,255,0.3), transparent)",
          borderRadius: 1,
        }} />

        {services.map((service, idx) => {
          const isActive = activeApp === service.id;
          const isOnline = healthStatus[service.id];

          return (
            <DockItem
              key={service.id}
              service={service}
              isActive={isActive}
              isOnline={isOnline}
              mouseX={mouseX}
              index={idx}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

function DockItem({
  service,
  isActive,
  isOnline,
  mouseX,
  index,
  onSelect,
}: {
  service: Service;
  isActive: boolean;
  isOnline: boolean;
  mouseX: number | null;
  index: number;
  onSelect: (id: string) => void;
}) {
  const itemRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  // Calculate scale based on mouse distance
  let scale = 1;
  if (mouseX !== null && itemRef.current) {
    const rect = itemRef.current.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const dist = Math.abs(mouseX - center);
    if (dist < MAGNIFY_RADIUS) {
      const factor = 1 - dist / MAGNIFY_RADIUS;
      scale = 1 + factor * ((MAX_SIZE / BASE_SIZE) - 1);
    }
  }

  const itemSize = BASE_SIZE * scale;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          marginBottom: 8,
          background: "rgba(0, 8, 16, 0.9)",
          border: "1px solid rgba(74,243,255,0.2)",
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: 11,
          color: "rgba(74,243,255,0.9)",
          fontFamily: "'SF Mono', monospace",
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          animation: "fade-up 0.15s ease-out",
        }}>
          {service.name}
        </div>
      )}

      <button
        ref={itemRef}
        onClick={() => onSelect(service.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={service.name}
        style={{
          position: "relative",
          width: itemSize,
          height: itemSize,
          borderRadius: Math.max(12, itemSize * 0.23),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: itemSize * 0.45,
          cursor: "pointer",
          border: "none",
          background: isActive
            ? "rgba(74,243,255,0.12)"
            : hovered
            ? "rgba(74,243,255,0.07)"
            : "rgba(255,255,255,0.04)",
          transition: "width 0.15s cubic-bezier(0.34,1.56,0.64,1), height 0.15s cubic-bezier(0.34,1.56,0.64,1), border-radius 0.15s ease, background 0.2s ease",
          boxShadow: isActive
            ? "0 0 16px rgba(74,243,255,0.3), 0 0 40px rgba(74,243,255,0.1), inset 0 0 0 1px rgba(74,243,255,0.3)"
            : hovered
            ? "0 0 10px rgba(74,243,255,0.15), inset 0 0 0 1px rgba(74,243,255,0.15)"
            : "inset 0 0 0 1px rgba(74,243,255,0.06)",
          outline: "none",
          transformOrigin: "bottom center",
        }}
      >
        {/* Icon */}
        <span style={{ lineHeight: 1, filter: isActive || hovered ? "drop-shadow(0 0 6px rgba(74,243,255,0.6))" : "none", transition: "filter 0.2s" }}>
          {service.icon}
        </span>

        {/* Active indicator + health dot */}
        {service.id !== "settings" && (
          <div style={{
            position: "absolute",
            bottom: 3,
            right: 3,
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: isOnline ? "#22c55e" : "rgba(239,68,68,0.6)",
            boxShadow: isOnline ? "0 0 4px #22c55e" : "none",
          }} />
        )}
      </button>

      {/* Active dot */}
      <div style={{
        width: 4,
        height: 4,
        borderRadius: "50%",
        background: isActive ? "#4af3ff" : "transparent",
        boxShadow: isActive ? "0 0 6px #4af3ff" : "none",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }} />
    </div>
  );
}
