"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Service, dockServices, categorizedServices, serviceCategories } from "../services";

interface DockProps {
  services: Service[];
  activeApp: string | null;
  onSelect: (id: string) => void;
  healthStatus: Record<string, boolean>;
}

const BASE_SIZE = 52;
const MAX_SIZE = 80;
const MAGNIFY_RADIUS = 120;

export default function Dock({ services: _allServices, activeApp, onSelect, healthStatus }: DockProps) {
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseX(null);
  }, []);

  // Close folder on outside click
  useEffect(() => {
    if (!folderOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        folderRef.current && !folderRef.current.contains(e.target as Node) &&
        dockRef.current && !dockRef.current.contains(e.target as Node)
      ) {
        setFolderOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [folderOpen]);

  // Build dock items: dashboard, inotion, seoh-audit, services-folder, settings
  const servicesFolderItem: Service = {
    id: "services-folder",
    name: "Services",
    icon: "📂",
    description: "All services",
  };

  const dockItems = [
    ...dockServices.filter((s) => s.id !== "settings"),
    servicesFolderItem,
    ...dockServices.filter((s) => s.id === "settings"),
  ];

  function handleDockSelect(id: string) {
    if (id === "services-folder") {
      setFolderOpen(!folderOpen);
      return;
    }
    if (id === "dashboard") {
      onSelect("dashboard");
      return;
    }
    setFolderOpen(false);
    onSelect(id);
  }

  const grouped = serviceCategories.map((cat) => ({
    name: cat,
    items: categorizedServices.filter((s) => s.category === cat),
  }));

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
      {/* Services folder popover */}
      {folderOpen && (
        <div
          ref={folderRef}
          style={{
            position: "absolute",
            bottom: "calc(100% + 12px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            background: "rgba(0, 8, 20, 0.88)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(74, 243, 255, 0.15)",
            borderRadius: 16,
            padding: "20px 24px",
            boxShadow: `
              0 12px 60px rgba(0, 0, 0, 0.8),
              0 0 0 1px rgba(74, 243, 255, 0.05) inset,
              0 0 40px rgba(74, 243, 255, 0.06)
            `,
            display: "grid",
            gridTemplateColumns: "repeat(3, 190px)",
            gap: "16px 24px",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {/* Top glow */}
          <div style={{
            position: "absolute",
            top: 0,
            left: "20%",
            right: "20%",
            height: 1,
            background: "linear-gradient(to right, transparent, rgba(74,243,255,0.3), transparent)",
            borderRadius: 1,
          }} />

          {grouped.map((group) => (
            <div key={group.name}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(74, 243, 255, 0.5)",
                  marginBottom: 8,
                  fontFamily: "'SF Mono', monospace",
                }}
              >
                {group.name}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {group.items.map((svc) => {
                  const isOnline = healthStatus[svc.id];
                  return (
                    <button
                      key={svc.id}
                      onClick={() => {
                        onSelect(svc.id);
                        setFolderOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        background: "transparent",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        color: "rgba(255,255,255,0.85)",
                        fontSize: 13,
                        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
                        textAlign: "left",
                        transition: "background 0.15s",
                        width: "100%",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(74,243,255,0.08)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>{svc.icon}</span>
                      <span style={{ flex: 1 }}>{svc.name}</span>
                      {svc.healthUrl && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: isOnline ? "#22c55e" : "rgba(239,68,68,0.6)",
                            boxShadow: isOnline ? "0 0 4px #22c55e" : "none",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

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

        {dockItems.map((service, idx) => {
          const isActive = service.id === "services-folder" ? folderOpen : activeApp === service.id;
          const isOnline = healthStatus[service.id];

          return (
            <DockItem
              key={service.id}
              service={service}
              isActive={isActive}
              isOnline={isOnline}
              mouseX={mouseX}
              index={idx}
              onSelect={handleDockSelect}
              hideHealth={service.id === "settings" || service.id === "services-folder" || service.id === "dashboard" || service.id === "seoh-audit"}
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
  hideHealth,
}: {
  service: Service;
  isActive: boolean;
  isOnline: boolean;
  mouseX: number | null;
  index: number;
  onSelect: (id: string) => void;
  hideHealth?: boolean;
}) {
  const itemRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

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
        <span style={{ lineHeight: 1, filter: isActive || hovered ? "drop-shadow(0 0 6px rgba(74,243,255,0.6))" : "none", transition: "filter 0.2s" }}>
          {service.icon}
        </span>

        {!hideHealth && service.healthUrl && (
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
