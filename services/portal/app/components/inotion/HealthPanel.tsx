"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ChevronDown, ChevronUp, ExternalLink, Server } from "lucide-react";

interface ServiceHealth {
  id: string;
  name: string;
  url: string;
  checkUrl?: string;
  port: string;
  category: string;
  description: string;
  wikiSlug: string;
  serviceUrl?: string; // clickable link to the actual service
}

// ─── All services ─────────────────────────────────────────────────────────────

const ALL_SERVICES: ServiceHealth[] = [
  { id: "portal",              name: "Portal",               url: "http://localhost:3020",                   port: "3020", category: "core",     description: "This dashboard — operations visibility and investor-facing portal",         wikiSlug: "Portal",                 serviceUrl: "http://localhost:3020" },
  { id: "outline",             name: "Outline / INotion",    url: "http://localhost:3010/api/auth.info",     port: "3010", category: "knowledge", description: "Knowledge wiki — documentation, runbooks, and operational intelligence",    wikiSlug: "INotion",                serviceUrl: "https://inotion.00raiser.space" },
  { id: "agentsmith-frontend", name: "AgentSmith UI",        url: "http://localhost:3000",                   port: "3000", category: "core",     description: "Web interface for agent orchestration and monitoring",                      wikiSlug: "AgentSmith",             serviceUrl: "http://localhost:3000" },
  { id: "krya",                name: "Krya AI",              url: "http://localhost:3100",                   port: "3100", category: "ai",       description: "AI assistant and conversational interface — powered by the agent network",  wikiSlug: "Krya",                   serviceUrl: "http://localhost:3100" },
  // Infrastructure services
  { id: "agentsmith-admin",    name: "AgentSmith Admin",     url: "http://localhost:3001",                   port: "3001", category: "core",     description: "Admin panel for system configuration and management",                       wikiSlug: "AgentSmith" },
  { id: "cortex",              name: "Cortex (Task Bridge)", url: "http://localhost:3011/health",            port: "3011", category: "core",     description: "Task bridge connecting OpenClaw agents to infrastructure services",         wikiSlug: "Cortex" },
  { id: "content-intel",       name: "Content Intel",        url: "http://localhost:3015/health",            port: "3015", category: "data",     description: "Content intelligence API — creator data, transcripts, and analytics",       wikiSlug: "Content Intelligence" },
  { id: "agentsmith-backend",  name: "AgentSmith API",       url: "http://localhost:4000/health",            port: "4000", category: "core",     description: "Backend API for agent scheduling, execution, and state management",         wikiSlug: "AgentSmith" },
  { id: "youtubedl",           name: "YouTube Downloader",   url: "http://localhost:8200/health",            port: "8200", category: "pipeline", description: "Downloads YouTube videos and captions for content analysis",                wikiSlug: "YouTube Pipeline" },
  { id: "newsletter",          name: "Newsletter Pipeline",  url: "http://localhost:8300/health",            port: "8300", category: "pipeline", description: "Processes and analyzes newsletter content from tracked creators",            wikiSlug: "Newsletter Pipeline" },
  { id: "apify",               name: "Apify Scraper",        url: "http://localhost:8400/health",            port: "8400", category: "pipeline", description: "Web scraping service for social media and content platforms",                wikiSlug: "Apify Scraper" },
  { id: "persona",             name: "Persona Pipeline",     url: "http://localhost:8500/health",            port: "8500", category: "ai",       description: "Builds AI personas from creator content — Board of Directors concept",      wikiSlug: "Persona Pipeline" },
  { id: "whisperflow",         name: "WhisperFlow (STT)",    url: "http://localhost:8766/health",            port: "8766", category: "ai",       description: "GPU-accelerated speech-to-text using OpenAI Whisper",                      wikiSlug: "WhisperFlow" },
  { id: "voiceforge",          name: "VoiceForge (TTS)",     url: "http://localhost:8001/health",            port: "8001", category: "ai",       description: "Paul Bettany / JARVIS voice synthesis via XTTS on RTX 5090",              wikiSlug: "VoiceForge" },
  { id: "gpu-tts",             name: "GPU TTS Server",       url: "http://10.25.10.60:8001/health",         port: "8001", category: "ai",       description: "Windows-side GPU server powering VoiceForge text-to-speech",              wikiSlug: "VoiceForge" },
  { id: "searxng",             name: "SearXNG",              url: "http://localhost:8888",                   port: "8888", category: "tools",    description: "Self-hosted meta search engine — privacy-first web search",                wikiSlug: "SearXNG" },
  { id: "authentik",           name: "Authentik (SSO)",      url: "http://localhost:9000/-/health/ready/",  port: "9000", category: "security", description: "Single sign-on and identity provider for all services",                    wikiSlug: "Authentik" },
  { id: "postgres",            name: "PostgreSQL",           url: "http://localhost:5432",                   port: "5432", category: "data",     description: "Primary database — creators, transcripts, content, and agent state",       wikiSlug: "PostgreSQL" },
  { id: "redis",               name: "Redis",                url: "http://localhost:6379",                   port: "6379", category: "data",     description: "In-memory cache and message broker for real-time operations",              wikiSlug: "Redis" },
];

// Application services (always visible, large cards)
const APP_IDS = new Set(["portal", "outline", "agentsmith-frontend", "krya"]);

const APPLICATION_SERVICES = ALL_SERVICES.filter((s) => APP_IDS.has(s.id));
const INFRASTRUCTURE_SERVICES = ALL_SERVICES.filter((s) => !APP_IDS.has(s.id));

// Services that can't be HTTP-probed — assume online
const NON_HTTP_SERVICES = new Set(["postgres", "redis"]);

// ─── Status helpers ───────────────────────────────────────────────────────────

type HealthState = "online" | "offline" | "checking";

function StatusDot({
  state,
  size = "sm",
}: {
  state: HealthState;
  size?: "sm" | "md" | "lg";
}) {
  const sz = size === "sm" ? "w-2 h-2" : size === "md" ? "w-2.5 h-2.5" : "w-3 h-3";
  const color =
    state === "online"
      ? "bg-emerald-500"
      : state === "offline"
      ? "bg-red-500"
      : "bg-zinc-400 dark:bg-zinc-600 animate-pulse";
  return <div className={`${sz} rounded-full flex-shrink-0 ${color}`} />;
}

// ─── Application card (large) ─────────────────────────────────────────────────

function AppCard({
  svc,
  state,
}: {
  svc: ServiceHealth;
  state: HealthState;
}) {
  const wikiUrl = `https://inotion.00raiser.space/search/${encodeURIComponent(svc.wikiSlug)}`;

  const statusLabel =
    state === "online" ? "Online" : state === "offline" ? "Offline" : "Checking…";
  const statusColor =
    state === "online"
      ? "text-emerald-600 dark:text-emerald-400"
      : state === "offline"
      ? "text-red-500 dark:text-red-400"
      : "text-zinc-400 dark:text-zinc-500";

  return (
    <div className="
      group relative flex flex-col gap-3 p-4 rounded-xl
      bg-white dark:bg-zinc-900
      border border-zinc-200 dark:border-zinc-800
      hover:border-zinc-300 dark:hover:border-zinc-700
      jarvis-app-card
      shadow-sm hover:shadow-md
      transition-all duration-200
    ">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot state={state} size="md" />
          <span className={`text-[11px] font-semibold font-mono ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">:{svc.port}</span>
      </div>

      {/* Name */}
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
          {svc.name}
        </h3>
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
          {svc.description}
        </p>
      </div>

      {/* Links */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        {svc.serviceUrl && (
          <a
            href={svc.serviceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium
              bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300
              hover:bg-zinc-200 dark:hover:bg-zinc-700
              jarvis-open-btn
              transition-colors
            "
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={10} />
            Open
          </a>
        )}
        <a
          href={wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium
            text-zinc-400 dark:text-zinc-500
            hover:text-zinc-700 dark:hover:text-zinc-300
            hover:bg-zinc-100 dark:hover:bg-zinc-800
            transition-colors
          "
          onClick={(e) => e.stopPropagation()}
        >
          Wiki
        </a>
      </div>
    </div>
  );
}

// ─── Infrastructure dot card (small) ─────────────────────────────────────────

function InfraCard({ svc, state }: { svc: ServiceHealth; state: HealthState }) {
  const wikiUrl = `https://inotion.00raiser.space/search/${encodeURIComponent(svc.wikiSlug)}`;
  return (
    <a
      href={wikiUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2 px-3 py-2 rounded-lg
        bg-zinc-50 dark:bg-zinc-800/60
        border border-zinc-100 dark:border-zinc-700/50
        hover:border-zinc-300 dark:hover:border-zinc-600
        hover:bg-zinc-100 dark:hover:bg-zinc-800
        transition-all duration-150 relative"
    >
      <StatusDot state={state} size="sm" />
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
          {svc.name}
        </div>
        <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">:{svc.port}</div>
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2
        bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900
        text-[10px] rounded-lg shadow-lg
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        pointer-events-none z-50 w-52 leading-relaxed">
        <div className="font-semibold mb-0.5">{svc.name}</div>
        <div className="opacity-80">{svc.description}</div>
        <div className="mt-1 opacity-60 text-[9px]">Click to view in Wiki</div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45 -mt-1" />
      </div>
    </a>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function HealthPanel() {
  const [health, setHealth] = useState<Record<string, HealthState>>({});
  const [infraOpen, setInfraOpen] = useState(false); // default collapsed
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setRefreshing(true);
    const results: Record<string, HealthState> = {};

    await Promise.all(
      ALL_SERVICES.map(async (svc) => {
        if (NON_HTTP_SERVICES.has(svc.id)) {
          results[svc.id] = "online";
          return;
        }
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
  const total = ALL_SERVICES.length;
  const allOnline = onlineCount === total && total > 0;
  const hasOffline = Object.values(health).some((s) => s === "offline");

  const statusDot = allOnline
    ? "bg-emerald-500"
    : hasOffline
    ? "bg-red-500"
    : "bg-amber-500";

  const statusColor = allOnline
    ? "text-emerald-600 dark:text-emerald-400"
    : hasOffline
    ? "text-red-500 dark:text-red-400"
    : "text-amber-500 dark:text-amber-400";

  return (
    <div className="space-y-4">
      {/* ── Applications section header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusDot} ${allOnline ? "animate-pulse" : ""}`} />
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Applications</span>
          <span className={`text-[11px] font-mono font-medium ${statusColor}`}>
            {Object.keys(health).length === 0 ? "Checking..." : `${onlineCount}/${total} online`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
              {lastChecked.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={checkHealth}
            title="Refresh health"
            className={`p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300
              hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all ${refreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* ── Application cards (always visible, 4-up grid) ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {APPLICATION_SERVICES.map((svc) => (
          <AppCard key={svc.id} svc={svc} state={health[svc.id] ?? "checking"} />
        ))}
      </div>

      {/* ── Infrastructure toggle ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <button
          className="w-full flex items-center justify-between px-5 py-3
            hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          onClick={() => setInfraOpen(!infraOpen)}
        >
          <div className="flex items-center gap-2">
            <Server size={12} className="text-zinc-400 dark:text-zinc-500" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Infrastructure ({INFRASTRUCTURE_SERVICES.length} services)
            </span>
            {/* Mini status bubbles */}
            <div className="flex items-center gap-1 ml-1">
              {(() => {
                const infraOnline = INFRASTRUCTURE_SERVICES.filter(
                  (s) => health[s.id] === "online"
                ).length;
                const infraOffline = INFRASTRUCTURE_SERVICES.filter(
                  (s) => health[s.id] === "offline"
                ).length;
                return (
                  <>
                    {infraOnline > 0 && (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        {infraOnline}↑
                      </span>
                    )}
                    {infraOffline > 0 && (
                      <span className="text-[10px] font-mono text-red-500 dark:text-red-400">
                        {infraOffline}↓
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {infraOpen ? "Hide" : "Show"}
            </span>
            {infraOpen ? (
              <ChevronUp size={12} className="text-zinc-400" />
            ) : (
              <ChevronDown size={12} className="text-zinc-400" />
            )}
          </div>
        </button>

        {/* Infrastructure grid (collapsed by default) */}
        {infraOpen && (
          <div className="px-5 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {INFRASTRUCTURE_SERVICES.map((svc) => (
                <InfraCard key={svc.id} svc={svc} state={health[svc.id] ?? "checking"} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
