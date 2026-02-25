"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface ServiceHealth {
  id: string;
  name: string;
  url: string;
  port: string;
  category: string;
}

const SERVICES: ServiceHealth[] = [
  { id: "agentsmith-frontend", name: "AgentSmith UI", url: "http://localhost:3000", port: "3000", category: "core" },
  { id: "agentsmith-admin", name: "AgentSmith Admin", url: "http://localhost:3001", port: "3001", category: "core" },
  { id: "outline", name: "Outline (INotion)", url: "http://localhost:3010/api/auth.info", port: "3010", category: "knowledge" },
  { id: "cortex", name: "Cortex (Task Bridge)", url: "http://localhost:3011/health", port: "3011", category: "core" },
  { id: "content-intel", name: "Content Intel", url: "http://localhost:3015/health", port: "3015", category: "data" },
  { id: "krya", name: "Krya AI", url: "http://localhost:3100", port: "3100", category: "ai" },
  { id: "agentsmith-backend", name: "AgentSmith API", url: "http://localhost:4000/health", port: "4000", category: "core" },
  { id: "youtubedl", name: "YouTube Downloader", url: "http://localhost:8200/health", port: "8200", category: "pipeline" },
  { id: "newsletter", name: "Newsletter Pipeline", url: "http://localhost:8300/health", port: "8300", category: "pipeline" },
  { id: "apify", name: "Apify Scraper", url: "http://localhost:8400/health", port: "8400", category: "pipeline" },
  { id: "persona", name: "Persona Pipeline", url: "http://localhost:8500/health", port: "8500", category: "ai" },
  { id: "whisperflow", name: "WhisperFlow (STT)", url: "http://localhost:8766/health", port: "8766", category: "ai" },
  { id: "searxng", name: "SearXNG", url: "http://localhost:8888", port: "8888", category: "tools" },
  { id: "authentik", name: "Authentik (SSO)", url: "http://localhost:9000/-/health/ready/", port: "9000", category: "security" },
  { id: "postgres", name: "PostgreSQL", url: "http://localhost:5432", port: "5432", category: "data" },
  { id: "redis", name: "Redis", url: "http://localhost:6379", port: "6379", category: "data" },
  { id: "voiceforge", name: "VoiceForge (TTS)", url: "http://localhost:8001/health", port: "8001", category: "ai" },
  { id: "portal", name: "Portal", url: "http://localhost:3020", port: "3020", category: "core" },
  { id: "gpu-tts", name: "GPU TTS Server", url: "http://10.25.10.60:8001/health", port: "8001", category: "ai" },
];

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  knowledge: "Knowledge",
  data: "Data",
  ai: "AI",
  pipeline: "Pipeline",
  security: "Security",
  tools: "Tools",
};

type HealthState = "online" | "offline" | "checking";

export default function HealthPanel() {
  const [health, setHealth] = useState<Record<string, HealthState>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setRefreshing(true);
    const results: Record<string, HealthState> = {};

    await Promise.all(
      SERVICES.map(async (svc) => {
        results[svc.id] = "checking";
        try {
          const res = await fetch(`/api/health-check?url=${encodeURIComponent(svc.url)}`);
          const data = await res.json();
          results[svc.id] = data.online ? "online" : "offline";
        } catch {
          results[svc.id] = "offline";
        }
      })
    );

    setHealth(results);
    setLastChecked(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const onlineCount = Object.values(health).filter((s) => s === "online").length;
  const total = SERVICES.length;
  const allOnline = onlineCount === total && total > 0;
  const hasOffline = Object.values(health).some((s) => s === "offline");

  const statusColor = allOnline
    ? "text-emerald-600 dark:text-emerald-400"
    : hasOffline
    ? "text-red-500 dark:text-red-400"
    : "text-amber-500 dark:text-amber-400";

  const statusDot = allOnline
    ? "bg-emerald-500"
    : hasOffline
    ? "bg-red-500"
    : "bg-amber-500";

  // Group by category
  const grouped: Record<string, ServiceHealth[]> = {};
  for (const svc of SERVICES) {
    if (!grouped[svc.category]) grouped[svc.category] = [];
    grouped[svc.category].push(svc);
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${statusDot} ${allOnline ? "animate-pulse" : ""}`} />
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">System Health</span>
          <span className={`text-xs font-mono font-medium ${statusColor}`}>
            {Object.keys(health).length === 0 ? "Checking..." : `${onlineCount}/${total}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
              {lastChecked.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); checkHealth(); }}
            className={`p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all ${refreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={12} />
          </button>
          {collapsed ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronUp size={14} className="text-zinc-400" />}
        </div>
      </div>

      {/* Service grid */}
      {!collapsed && (
        <div className="px-5 pb-5 border-t border-zinc-100 dark:border-zinc-800">
          <div className="space-y-4 mt-4">
            {Object.entries(grouped).map(([category, svcs]) => (
              <div key={category}>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                  {CATEGORY_LABELS[category] ?? category}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {svcs.map((svc) => {
                    const state = health[svc.id] ?? "checking";
                    return (
                      <div
                        key={svc.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/50"
                        title={`Port ${svc.port}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            state === "online"
                              ? "bg-emerald-500"
                              : state === "offline"
                              ? "bg-red-500"
                              : "bg-zinc-400 dark:bg-zinc-600 animate-pulse"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                            {svc.name}
                          </div>
                          <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                            :{svc.port}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
