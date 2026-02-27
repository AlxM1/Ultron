"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  format,
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentJob {
  id: string;
  name: string;
  role?: string;
  schedule: string;
  scheduleDesc: string;
  category: string;
  model?: string;
  status?: string;
  description?: string;
  lastRun?: string;
}

interface PortalCalendarProps {
  agents: AgentJob[];
  onJobClick?: (job: AgentJob) => void;
}

// ─── Color Category Mapping ──────────────────────────────────────────────────

type ColorCategory = "monitoring" | "cron" | "pipeline" | "ai" | "maintenance";

const AGENT_COLOR_MAP: Record<string, ColorCategory> = {
  "health-monitor": "monitoring",
  "cortex-monitor": "monitoring",
  "sauron": "monitoring",
  "watchdog": "monitoring",
  "supervisor": "monitoring",
  "agentsmith-orchestrator": "monitoring",
  "nightly-pipeline": "cron",
  "daily-cost-report": "cron",
  "daily-todo-report": "cron",
  "weekly-data-retention": "cron",
  "data-retention-dry-run": "cron",
  "self-audit": "cron",
  "replicator": "cron",
  "inotion-sync": "cron",
  "youtube-scraper": "pipeline",
  "content-intel": "pipeline",
  "batch-captions": "pipeline",
  "creator-intelligence": "pipeline",
  "persona-pipeline": "ai",
  "scorpion": "ai",
  "brain-sync": "ai",
  "backup-system": "maintenance",
  "cost-tracker": "maintenance",
  "newsletter-pipeline": "pipeline",
  // Additional agents from current roster
  "memory-consolidation": "ai",
  "content-scraper": "pipeline",
  "youtube-downloader": "pipeline",
  "transcript-processor": "pipeline",
  "security-audit": "ai",
  "performance-metrics": "cron",
  "roadmap-updates": "cron",
  "content-intel-weekly": "pipeline",
};

function getColorCategory(agent: AgentJob): ColorCategory {
  return AGENT_COLOR_MAP[agent.id] ?? "cron";
}

// ─── Color Palette ───────────────────────────────────────────────────────────

interface CategoryStyle {
  label: string;
  dot: string;        // light mode hex
  dotDark: string;    // dark mode hex
  pillBg: string;
  pillText: string;
}

const COLOR_CATEGORIES: Record<ColorCategory, CategoryStyle> = {
  cron: {
    label: "Cron Jobs",
    dot: "#F59E0B",
    dotDark: "#FBBF24",
    pillBg: "bg-amber-50 dark:bg-amber-900/20",
    pillText: "text-amber-700 dark:text-amber-300",
  },
  monitoring: {
    label: "Monitoring",
    dot: "#3B82F6",
    dotDark: "#60A5FA",
    pillBg: "bg-blue-50 dark:bg-blue-900/20",
    pillText: "text-blue-700 dark:text-blue-300",
  },
  pipeline: {
    label: "Content Pipeline",
    dot: "#10B981",
    dotDark: "#34D399",
    pillBg: "bg-emerald-50 dark:bg-emerald-900/20",
    pillText: "text-emerald-700 dark:text-emerald-300",
  },
  ai: {
    label: "AI / Analysis",
    dot: "#8B5CF6",
    dotDark: "#A78BFA",
    pillBg: "bg-violet-50 dark:bg-violet-900/20",
    pillText: "text-violet-700 dark:text-violet-300",
  },
  maintenance: {
    label: "Maintenance",
    dot: "#F43F5E",
    dotDark: "#FB7185",
    pillBg: "bg-rose-50 dark:bg-rose-900/20",
    pillText: "text-rose-700 dark:text-rose-300",
  },
};

// ─── Hash helper for deterministic scatter ───────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ─── Cron Helpers ────────────────────────────────────────────────────────────

function agentRunsOnDay(agent: AgentJob, date: Date): boolean {
  const parts = agent.schedule.split(" ");
  if (parts.length < 5) return false;
  const weekdayPart = parts[4];
  if (weekdayPart !== "*") {
    const targetDOW = parseInt(weekdayPart);
    return date.getDay() === targetDOW;
  }
  return true;
}

/** Returns the primary run hour (0–23) for vertical positioning, or -1 for all-day */
function getRunHour(agent: AgentJob): number {
  const parts = agent.schedule.split(" ");
  if (parts.length < 5) return -1;
  const hourPart = parts[1];
  if (hourPart === "*") return -1; // runs every hour
  if (hourPart.startsWith("*/")) return -1; // runs every N hours
  return parseInt(hourPart.split(",")[0]);
}

function getScheduleLabel(agent: AgentJob): string {
  const parts = agent.schedule.split(" ");
  if (parts.length < 5) return agent.scheduleDesc;
  const minutePart = parts[0];
  const hourPart = parts[1];
  if (hourPart === "*" && minutePart.startsWith("*/")) {
    return `Every ${minutePart.slice(2)} min`;
  }
  if (hourPart.startsWith("*/")) {
    return `Every ${hourPart.slice(2)} hours`;
  }
  if (hourPart !== "*") {
    const h = parseInt(hourPart.split(",")[0]);
    const m = minutePart.startsWith("*/") ? 0 : parseInt(minutePart) || 0;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `Daily at ${h12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
  }
  return agent.scheduleDesc;
}

function getLastRunRelative(agent: AgentJob): string {
  if (!agent.lastRun) return "—";
  const ms = Date.now() - new Date(agent.lastRun).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─── Dark mode hook ──────────────────────────────────────────────────────────

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// ─── Dot Component ───────────────────────────────────────────────────────────

interface DotProps {
  agent: AgentJob;
  isDark: boolean;
  onHover: (e: React.MouseEvent, agent: AgentJob) => void;
  onLeave: () => void;
  onClick: (e: React.MouseEvent, agent: AgentJob) => void;
}

function AgentDot({ agent, isDark, onHover, onLeave, onClick }: DotProps) {
  const cat = getColorCategory(agent);
  const style = COLOR_CATEGORIES[cat];
  const color = isDark ? style.dotDark : style.dot;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e, agent); }}
      onMouseEnter={(e) => onHover(e, agent)}
      onMouseLeave={onLeave}
      className="w-[7px] h-[7px] rounded-full flex-shrink-0 transition-transform duration-150 hover:scale-150 focus:outline-none cursor-pointer"
      style={{
        backgroundColor: color,
        boxShadow: isDark ? `0 0 6px ${color}4D` : `0 0 4px ${color}33`,
      }}
      aria-label={agent.name}
    />
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

interface TooltipData {
  agent: AgentJob;
  x: number;
  y: number;
}

function AgentTooltip({ data }: { data: TooltipData }) {
  const cat = getColorCategory(data.agent);
  const style = COLOR_CATEGORIES[cat];
  const schedule = getScheduleLabel(data.agent);

  return (
    <div
      className="fixed z-[60] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{ left: data.x, top: data.y - 10, transform: "translate(-50%, -100%)" }}
    >
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 min-w-[180px]">
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: style.dot }}
          />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
            {data.agent.name}
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">{schedule}</div>
        <div className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${style.pillBg} ${style.pillText}`}>
          {style.label}
        </div>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 bg-white dark:bg-zinc-800 border-r border-b border-zinc-200 dark:border-zinc-700" />
    </div>
  );
}

// ─── Zoom Bubble (click detail card) ─────────────────────────────────────────

interface BubbleData {
  agent: AgentJob;
  x: number;
  y: number;
}

function ZoomBubble({ data, onClose }: { data: BubbleData; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cat = getColorCategory(data.agent);
  const style = COLOR_CATEGORIES[cat];
  const schedule = getScheduleLabel(data.agent);
  const wikiUrl = `https://inotion.00raiser.space/search/${encodeURIComponent(data.agent.name)}`;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Clamp position to viewport
  const left = Math.min(Math.max(data.x, 160), typeof window !== "undefined" ? window.innerWidth - 160 : 800);
  const top = Math.min(Math.max(data.y, 20), typeof window !== "undefined" ? window.innerHeight - 280 : 500);

  return (
    <div
      ref={ref}
      className="fixed z-[70] animate-in fade-in zoom-in-90 duration-200"
      style={{ left, top, transform: "translate(-50%, -50%)" }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 p-5 w-[300px]">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: style.dot }}
            />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{data.agent.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Schedule */}
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 font-mono">
          {schedule}
        </div>

        {/* Category badge */}
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.pillBg} ${style.pillText} mb-3`}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
          {style.label}
        </div>

        {/* Status + Last run */}
        <div className="flex items-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${data.agent.status === "failed" ? "bg-red-500" : "bg-emerald-500"}`} />
            <span className="text-zinc-600 dark:text-zinc-400">
              {data.agent.status === "failed" ? "Failed" : "Active"}
            </span>
          </div>
          <div className="text-zinc-400 dark:text-zinc-500">
            Last run: {getLastRunRelative(data.agent)}
          </div>
        </div>

        {/* Description */}
        {data.agent.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">
            {data.agent.description}
          </p>
        )}

        {/* Model */}
        {data.agent.model && data.agent.model !== "script" && (
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-3">
            Model: <span className="font-mono text-zinc-600 dark:text-zinc-400">{data.agent.model}</span>
          </div>
        )}

        {/* Wiki link */}
        <a
          href={wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 text-xs font-medium hover:underline transition-colors ${style.pillText}`}
        >
          View details in Wiki
          <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

// ─── Month View ──────────────────────────────────────────────────────────────

function MonthView({
  month,
  agents,
  activeFilter,
}: {
  month: Date;
  agents: AgentJob[];
  activeFilter: ColorCategory | null;
}) {
  const isDark = useIsDark();
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 0 }), 6);
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const [bubble, setBubble] = useState<BubbleData | null>(null);

  const handleAgentClick = useCallback((e: React.MouseEvent, agent: AgentJob) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setBubble({ agent, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, []);

  const closeBubble = useCallback(() => setBubble(null), []);

  const filteredAgents = useMemo(() => {
    if (!activeFilter) return agents;
    return agents.filter((a) => getColorCategory(a) === activeFilter);
  }, [agents, activeFilter]);

  const DOW_HEADERS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Helper: format run time for display
  function getTimeLabel(agent: AgentJob): string {
    const hour = getRunHour(agent);
    if (hour === -1) return "";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? "PM" : "AM";
    const min = agent.schedule.split(" ")[0];
    const m = min.startsWith("*/") ? "00" : (parseInt(min) || 0).toString().padStart(2, "0");
    return `${h12}:${m} ${ampm}`;
  }

  // Helper: is recurring (daily or always-running)
  function isRecurring(agent: AgentJob): boolean {
    return agent.category === "always-running" || agent.category === "daily";
  }

  // Max visible rows per cell in month view
  const MAX_VISIBLE = 6;

  return (
    <>
      {bubble && <ZoomBubble data={bubble} onClose={closeBubble} />}

      {/* DOW headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {DOW_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 py-3"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-t border-l border-zinc-200 dark:border-zinc-800">
        {calDays.map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const dayAgents = filteredAgents.filter((a) => agentRunsOnDay(a, day));
          const isCurrentDay = isToday(day);

          // Separate always-running from scheduled agents
          const alwaysRunning = dayAgents.filter((a) => a.category === "always-running");
          const scheduled = dayAgents.filter((a) => a.category !== "always-running");

          // Sort scheduled by hour ascending
          const sorted = [...scheduled].sort((a, b) => {
            const ha = getRunHour(a);
            const hb = getRunHour(b);
            if (ha === -1 && hb === -1) return a.name.localeCompare(b.name);
            if (ha === -1) return 1;
            if (hb === -1) return -1;
            return ha - hb;
          });

          const visible = sorted.slice(0, MAX_VISIBLE);
          const overflow = sorted.length - MAX_VISIBLE;

          return (
            <div
              key={day.toISOString()}
              className={`border-r border-b border-zinc-200 dark:border-zinc-800 min-h-[200px] p-2 relative transition-colors duration-150 ${
                !inMonth ? "opacity-20" : ""
              } ${
                isCurrentDay
                  ? "bg-blue-50/70 dark:bg-blue-950/30"
                  : "bg-white dark:bg-zinc-950"
              }`}
            >
              {/* Day header with number + event count */}
              <div className="flex items-baseline justify-between mb-2">
                <span className={`text-sm font-semibold leading-none select-none ${
                  isCurrentDay
                    ? "text-blue-600 dark:text-blue-400 font-bold"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}>
                  {format(day, "d")}
                </span>
                {inMonth && dayAgents.length > 0 && (
                  <span className="text-[9px] text-zinc-300 dark:text-zinc-600 select-none">
                    {scheduled.length} tasks
                  </span>
                )}
              </div>

              {/* Always-running summary */}
              {inMonth && alwaysRunning.length > 0 && (
                <div className="text-[9px] text-blue-400 dark:text-blue-500 mb-1.5 px-1 opacity-70">
                  {alwaysRunning.length} monitoring agents active
                </div>
              )}

              {/* Scheduled agent event cards — Digital Calendar style */}
              {inMonth && visible.length > 0 && (
                <div className="space-y-1.5">
                  {visible.map((agent) => {
                    const cat = getColorCategory(agent);
                    const style = COLOR_CATEGORIES[cat];
                    const time = getTimeLabel(agent);
                    const recurring = isRecurring(agent);

                    return (
                      <button
                        key={agent.id}
                        onClick={(e) => handleAgentClick(e, agent)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 hover:brightness-95 dark:hover:brightness-110 ${style.pillBg}`}
                      >
                        {/* Agent name + recurring icon */}
                        <div className="flex items-center gap-1">
                          <span className={`text-[11px] font-semibold truncate flex-1 ${style.pillText}`}>
                            {recurring && <span className="mr-0.5">↻</span>}
                            {agent.name}
                          </span>
                        </div>
                        {/* Time */}
                        {time && (
                          <div className={`text-[9px] mt-0.5 opacity-70 ${style.pillText}`}>
                            {time}
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 pl-1 font-medium">
                      +{overflow} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  agents,
  activeFilter,
}: {
  weekStart: Date;
  agents: AgentJob[];
  activeFilter: ColorCategory | null;
}) {
  const isDark = useIsDark();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [bubble, setBubble] = useState<BubbleData | null>(null);

  const handleDotHover = useCallback((e: React.MouseEvent, agent: AgentJob) => {
    if (bubble) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({ agent, x: rect.left + rect.width / 2, y: rect.top });
  }, [bubble]);

  const handleDotLeave = useCallback(() => setTooltip(null), []);

  const handleDotClick = useCallback((e: React.MouseEvent, agent: AgentJob) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setBubble({ agent, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setTooltip(null);
  }, []);

  const closeBubble = useCallback(() => setBubble(null), []);

  const filteredAgents = useMemo(() => {
    if (!activeFilter) return agents;
    return agents.filter((a) => getColorCategory(a) === activeFilter);
  }, [agents, activeFilter]);

  return (
    <>
      {tooltip && <AgentTooltip data={tooltip} />}
      {bubble && <ZoomBubble data={bubble} onClose={closeBubble} />}

      <div className="grid grid-cols-7 border-t border-l border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {days.map((day) => {
          const dayAgents = filteredAgents.filter((a) => agentRunsOnDay(a, day));
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`border-r border-b border-zinc-200 dark:border-zinc-800 min-h-[200px] p-2.5 transition-colors duration-150 ${
                isCurrentDay
                  ? "bg-blue-50 dark:bg-blue-950/50"
                  : "bg-white dark:bg-zinc-950"
              }`}
            >
              {/* Day header */}
              <div className="mb-3 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-sm font-bold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${
                    isCurrentDay
                      ? "bg-blue-500 text-white"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>

              {/* Agent cards — pastel style matching month view */}
              <div className="space-y-1.5">
                {dayAgents.map((agent) => {
                  const cat = getColorCategory(agent);
                  const catStyle = COLOR_CATEGORIES[cat];
                  const hour = getRunHour(agent);
                  const recurring = agent.category === "always-running" || agent.category === "daily";
                  // Format time label
                  let timeLabel = "";
                  if (hour >= 0) {
                    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    const ampm = hour >= 12 ? "PM" : "AM";
                    const min = agent.schedule.split(" ")[0];
                    const m = min.startsWith("*/") ? "00" : (parseInt(min) || 0).toString().padStart(2, "0");
                    timeLabel = `${h12}:${m} ${ampm}`;
                  }

                  return (
                    <button
                      key={agent.id}
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setBubble({ agent, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 hover:brightness-95 dark:hover:brightness-110 ${catStyle.pillBg}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-semibold truncate flex-1 ${catStyle.pillText}`}>
                          {recurring && <span className="mr-0.5">↻</span>}
                          {agent.name}
                        </span>
                      </div>
                      {timeLabel && (
                        <div className={`text-[9px] mt-0.5 opacity-70 ${catStyle.pillText}`}>
                          {timeLabel}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Legend Panel ─────────────────────────────────────────────────────────────

function LegendPanel({
  agents,
  activeFilter,
  onFilterToggle,
}: {
  agents: AgentJob[];
  activeFilter: ColorCategory | null;
  onFilterToggle: (cat: ColorCategory) => void;
}) {
  const isDark = useIsDark();

  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sticky top-24">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
        Agent Categories
      </h3>
      <div className="space-y-2.5">
        {(Object.entries(COLOR_CATEGORIES) as [ColorCategory, CategoryStyle][]).map(
          ([key, style]) => {
            const count = agents.filter((a) => getColorCategory(a) === key).length;
            const isActive = activeFilter === key;
            const color = isDark ? style.dotDark : style.dot;

            return (
              <button
                key={key}
                onClick={() => onFilterToggle(key)}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-all duration-150 ${
                  isActive
                    ? "bg-zinc-200 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-700"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {style.label}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  {count}
                </span>
              </button>
            );
          }
        )}
      </div>

      {activeFilter && (
        <button
          onClick={() => onFilterToggle(activeFilter)}
          className="mt-3 text-[11px] text-blue-500 dark:text-blue-400 hover:underline font-medium"
        >
          Show All
        </button>
      )}

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 space-y-1">
          <div className="flex justify-between">
            <span>Total agents</span>
            <span className="font-mono font-medium text-zinc-600 dark:text-zinc-400">
              {agents.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Calendar Component ─────────────────────────────────────────────────

export default function PortalCalendar({
  agents,
  onJobClick,
}: PortalCalendarProps) {
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<ColorCategory | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

  function prev() {
    if (view === "weekly") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  }

  function next() {
    if (view === "weekly") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  const periodLabel = useMemo(() => {
    if (view === "weekly") {
      const end = addDays(weekStart, 6);
      if (weekStart.getMonth() === end.getMonth()) {
        return `${format(weekStart, "MMMM d")}–${format(end, "d, yyyy")}`;
      }
      return `${format(weekStart, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy").toUpperCase();
  }, [view, currentDate, weekStart]);

  const handleFilterToggle = useCallback((cat: ColorCategory) => {
    setActiveFilter((prev) => (prev === cat ? null : cat));
  }, []);

  return (
    <div>
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          {/* Navigation arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={prev}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-150 active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-150 active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Period label */}
          <h2 className="text-lg font-bold tracking-wide text-zinc-800 dark:text-zinc-100 uppercase">
            {periodLabel}
          </h2>

          <button
            onClick={goToday}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-150 font-medium active:scale-95"
          >
            Today
          </button>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <button
            onClick={() => setView("monthly")}
            className={`text-xs px-3 py-1.5 transition-all duration-200 font-medium ${
              view === "monthly"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView("weekly")}
            className={`text-xs px-3 py-1.5 transition-all duration-200 border-l border-zinc-200 dark:border-zinc-700 font-medium ${
              view === "weekly"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar + Legend layout */}
      <div className="flex gap-5">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          {view === "weekly" ? (
            <WeekView
              weekStart={weekStart}
              agents={agents}
              activeFilter={activeFilter}
            />
          ) : (
            <MonthView
              month={currentDate}
              agents={agents}
              activeFilter={activeFilter}
            />
          )}
        </div>

        {/* Legend panel — right side, sticky */}
        <div className="hidden lg:block w-48 flex-shrink-0">
          <LegendPanel
            agents={agents}
            activeFilter={activeFilter}
            onFilterToggle={handleFilterToggle}
          />
        </div>
      </div>
    </div>
  );
}
