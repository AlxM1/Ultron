"use client";

import { Service } from "../services";
import { Home, Server, Brain, Activity, Workflow } from "lucide-react";

type PageView = "home" | "services" | "content-intel" | "timeline" | "workflows";

interface MenuBarProps {
  activeService: Service | null;
  activePage?: PageView;
  onHome: () => void;
  onNavigate?: (page: PageView) => void;
}

const navItems = [
  { id: "services" as PageView, label: "Services", icon: Server },
  { id: "timeline" as PageView, label: "Timeline", icon: Activity },
  { id: "workflows" as PageView, label: "Workflows", icon: Workflow },
  { id: "content-intel" as PageView, label: "Content Intel", icon: Brain },
];

export default function MenuBar({ activeService, activePage = "home", onHome, onNavigate }: MenuBarProps) {
  return (
    <div className="glass border-b border-white/5 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onHome}
          className={`flex items-center gap-2 transition-colors ${
            activePage === "home" && !activeService
              ? "text-accent"
              : "text-white/70 hover:text-accent"
          }`}
        >
          <Home size={18} />
          <span className="text-sm font-medium">Home</span>
        </button>
        
        {!activeService && onNavigate && (
          <>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 transition-colors ${
                    activePage === item.id
                      ? "text-accent"
                      : "text-white/70 hover:text-accent"
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </>
        )}
        
        {activeService && (
          <>
            <div className="text-white/20">/</div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeService.icon}</span>
              <span className="text-sm font-medium text-white/90">{activeService.name}</span>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs text-white/40">
          {new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
