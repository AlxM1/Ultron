"use client";

import { useEffect, useState } from "react";
import { Service } from "../services";
import { Home, Server, Brain, Activity, Workflow, DollarSign, Map, BookOpen } from "lucide-react";

type PageView = "home" | "services" | "content-intel" | "timeline" | "workflows" | "costs" | "roadmap";

interface MenuBarProps {
  activeService: Service | null;
  activePage?: PageView;
  onHome: () => void;
  onNavigate?: (page: PageView) => void;
}

const navItems = [
  { id: "services" as PageView, label: "Services", icon: Server, href: undefined },
  { id: "timeline" as PageView, label: "Timeline", icon: Activity, href: undefined },
  { id: "workflows" as PageView, label: "Workflows", icon: Workflow, href: undefined },
  { id: "content-intel" as PageView, label: "Intel", icon: Brain, href: undefined },
  { id: "costs" as PageView, label: "Costs", icon: DollarSign, href: undefined },
  { id: "roadmap" as PageView, label: "Roadmap", icon: Map, href: undefined },
  { id: "inotion" as PageView, label: "INotion", icon: BookOpen, href: "/inotion" },
];

export default function MenuBar({ activeService, activePage = "home", onHome, onNavigate }: MenuBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: 44,
        background: "rgba(0, 6, 14, 0.85)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid rgba(74, 243, 255, 0.1)",
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      {/* Bottom glow line */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: "10%",
        right: "10%",
        height: 1,
        background: "linear-gradient(to right, transparent, rgba(74,243,255,0.15), transparent)",
      }} />

      {/* Left: Logo + Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {/* Home */}
        <NavButton
          active={activePage === "home" && !activeService}
          onClick={onHome}
          icon={<Home size={14} />}
          label="Home"
        />

        {/* Separator */}
        <div style={{ width: 1, height: 16, background: "rgba(74,243,255,0.1)", margin: "0 6px" }} />

        {/* Nav items (only when no service active) */}
        {!activeService && onNavigate && navItems.map((item) => {
          const Icon = item.icon;
          if (item.href) {
            return (
              <NavAnchor
                key={item.id}
                href={item.href}
                icon={<Icon size={13} />}
                label={item.label}
              />
            );
          }
          return (
            <NavButton
              key={item.id}
              active={activePage === item.id}
              onClick={() => onNavigate(item.id)}
              icon={<Icon size={13} />}
              label={item.label}
            />
          );
        })}

        {/* Breadcrumb for active service */}
        {activeService && (
          <>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              background: "rgba(74,243,255,0.06)",
              border: "1px solid rgba(74,243,255,0.12)",
              borderRadius: 6,
            }}>
              <span style={{ fontSize: 14 }}>{activeService.icon}</span>
              <span style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#4af3ff",
                textShadow: "0 0 8px rgba(74,243,255,0.4)",
                letterSpacing: "0.03em",
              }}>
                {activeService.name}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Center: System status */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {["MESH", "AI", "SECURE"].map((label) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 4px #22c55e",
              animation: "status-online 3s ease-in-out infinite",
            }} />
            <span style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "rgba(74,243,255,0.35)",
              fontFamily: "'SF Mono', monospace",
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Right: Time + version */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{
          fontSize: 9,
          color: "rgba(74,243,255,0.25)",
          fontFamily: "'SF Mono', monospace",
          letterSpacing: "0.1em",
        }}>
          JARVIS v4.6.2
        </span>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "'SF Mono', monospace",
          color: "rgba(74,243,255,0.7)",
          letterSpacing: "0.08em",
        }}>
          {timeStr}
        </span>
      </div>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 6,
        border: active
          ? "1px solid rgba(74,243,255,0.2)"
          : "1px solid transparent",
        background: active
          ? "rgba(74,243,255,0.08)"
          : hov
          ? "rgba(74,243,255,0.04)"
          : "transparent",
        cursor: "pointer",
        color: active || hov ? "#4af3ff" : "rgba(255,255,255,0.5)",
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        transition: "all 0.18s ease",
        textShadow: active ? "0 0 8px rgba(74,243,255,0.4)" : "none",
        boxShadow: active ? "0 0 10px rgba(74,243,255,0.06)" : "none",
        outline: "none",
        letterSpacing: "0.02em",
      }}
    >
      <span style={{ opacity: active || hov ? 1 : 0.6 }}>{icon}</span>
      {label}
    </button>
  );
}

function NavAnchor({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const [hov, setHov] = useState(false);

  return (
    <a
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 6,
        border: "1px solid transparent",
        background: hov ? "rgba(74,243,255,0.04)" : "transparent",
        cursor: "pointer",
        color: hov ? "#4af3ff" : "rgba(255,255,255,0.5)",
        fontSize: 12,
        fontWeight: 400,
        transition: "all 0.18s ease",
        textDecoration: "none",
        letterSpacing: "0.02em",
      }}
    >
      <span style={{ opacity: hov ? 1 : 0.6 }}>{icon}</span>
      {label}
    </a>
  );
}
