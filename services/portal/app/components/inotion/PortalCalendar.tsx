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

// ─── Per-Agent Color Palette ─────────────────────────────────────────────────

interface AgentColorStyle {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

const AGENT_COLORS: AgentColorStyle[] = [
  { bg: "bg-blue-100 dark:bg-blue-500/15", border: "border-blue-200 dark:border-blue-500/30", text: "text-blue-600 dark:text-blue-400", dot: "#3B82F6" },
  { bg: "bg-emerald-100 dark:bg-emerald-500/15", border: "border-emerald-200 dark:border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", dot: "#10B981" },
  { bg: "bg-violet-100 dark:bg-violet-500/15", border: "border-violet-200 dark:border-violet-500/30", text: "text-violet-600 dark:text-violet-400", dot: "#8B5CF6" },
  { bg: "bg-amber-100 dark:bg-amber-500/15", border: "border-amber-200 dark:border-amber-500/30", text: "text-amber-600 dark:text-amber-400", dot: "#F59E0B" },
  { bg: "bg-rose-100 dark:bg-rose-500/15", border: "border-rose-200 dark:border-rose-500/30", text: "text-rose-600 dark:text-rose-400", dot: "#F43F5E" },
  { bg: "bg-cyan-100 dark:bg-cyan-500/15", border: "border-cyan-200 dark:border-cyan-500/30", text: "text-cyan-600 dark:text-cyan-400", dot: "#06B6D4" },
  { bg: "bg-pink-100 dark:bg-pink-500/15", border: "border-pink-200 dark:border-pink-500/30", text: "text-pink-600 dark:text-pink-400", dot: "#EC4899" },
  { bg: "bg-lime-100 dark:bg-lime-500/15", border: "border-lime-200 dark:border-lime-500/30", text: "text-lime-600 dark:text-lime-400", dot: "#84CC16" },
  { bg: "bg-orange-100 dark:bg-orange-500/15", border: "border-orange-200 dark:border-orange-500/30", text: "text-orange-600 dark:text-orange-400", dot: "#F97316" },
  { bg: "bg-teal-100 dark:bg-teal-500/15", border: "border-teal-200 dark:border-teal-500/30", text: "text-teal-600 dark:text-teal-400", dot: "#14B8A6" },
  { bg: "bg-indigo-100 dark:bg-indigo-500/15", border: "border-indigo-200 dark:border-indigo-500/30", text: "text-indigo-600 dark:text-indigo-400", dot: "#6366F1" },
  { bg: "bg-fuchsia-100 dark:bg-fuchsia-500/15", border: "border-fuchsia-200 dark:border-fuchsia-500/30", text: "text-fuchsia-600 dark:text-fuchsia-400", dot: "#D946EF" },
  { bg: "bg-sky-100 dark:bg-sky-500/15", border: "border-sky-200 dark:border-sky-500/30", text: "text-sky-600 dark:text-sky-400", dot: "#0EA5E9" },
  { bg: "bg-red-100 dark:bg-red-500/15", border: "border-red-200 dark:border-red-500/30", text: "text-red-600 dark:text-red-400", dot: "#EF4444" },
  { bg: "bg-yellow-100 dark:bg-yellow-500/15", border: "border-yellow-200 dark:border-yellow-500/30", text: "text-yellow-600 dark:text-yellow-400", dot: "#EAB308" },
  { bg: "bg-green-100 dark:bg-green-500/15", border: "border-green-200 dark:border-green-500/30", text: "text-green-600 dark:text-green-400", dot: "#22C55E" },
];

// ─── Hash helper for deterministic color assignment ──────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getAgentColor(name: string): AgentColorStyle {
  return AGENT_COLORS[hashStr(name) % AGENT_COLORS.length];
}

// ─── Schedule Category (kept for filtering) ──────────────────────────────────

type ScheduleCategory = "always-running" | "daily" | "weekly" | "manual";

function getScheduleCategory(agent: AgentJob): ScheduleCategory {
  const cat = agent.category as ScheduleCategory;
  if (cat === "always-running" || cat === "daily" || cat === "weekly" || cat === "manual") return cat;
  return "manual";
}

const CATEGORY_LABELS: Record<ScheduleCategory, string> = {
  "always-running": "Always Running",
  daily: "Daily",
  weekly: "Weekly",
  manual: "Manual",
};

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

function getRunHour(agent: AgentJob): number {
  const parts = agent.schedule.split(" ");
  if (parts.length < 5) return -1;
  const hourPart = parts[1];
  if (hourPart === "*") return -1;
  if (hourPart.startsWith("*/")) return -1;
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

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

interface TooltipData {
  agent: AgentJob;
  x: number;
  y: number;
}

function AgentTooltip({ data }: { data: TooltipData }) {
  const color = getAgentColor(data.agent.name);
  const schedule = getScheduleLabel(data.agent);
  const catLabel = CATEGORY_LABELS[getScheduleCategory(data.agent)];

  return (
    <div
      className="fixed z-[60] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{ left: data.x, top: data.y - 10, transform: "translate(-50%, -100%)" }}
    >
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 min-w-[180px]">
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color.dot }}
          />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
            {data.agent.name}
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">{schedule}</div>
        <div className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${color.bg} ${color.text}`}>
          {catLabel}
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
  const color = getAgentColor(data.agent.name);
  const schedule = getScheduleLabel(data.agent);
  const catLabel = CATEGORY_LABELS[getScheduleCategory(data.agent)];
  const wikiUrl = `https://inotion.00raiser.space/search/${encodeURIComponent(data.agent.name)}`;

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
              style={{ backgroundColor: color.dot }}
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
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${color.bg} ${color.text} mb-3`}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color.dot }} />
          {catLabel}
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
          className={`inline-flex items-center gap-1 text-xs font-medium hover:underline transition-colors ${color.text}`}
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
  activeFilter: ScheduleCategory | null;
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
    return agents.filter((a) => getScheduleCategory(a) === activeFilter);
  }, [agents, activeFilter]);

  const DOW_HEADERS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

          const alwaysRunning = dayAgents.filter((a) => a.category === "always-running");
          const scheduled = dayAgents.filter((a) => a.category !== "always-running");

          const sorted = [...scheduled].sort((a, b) => {
            const ha = getRunHour(a);
            const hb = getRunHour(b);
            if (ha === -1 && hb === -1) return a.name.localeCompare(b.name);
            if (ha === -1) return 1;
            if (hb === -1) return -1;
            return ha - hb;
          });

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
              {/* Day header */}
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

              {/* Scheduled agent event cards — consolidated by time slot */}
              {inMonth && sorted.length > 0 && (
                <div className="space-y-1">
                  {(() => {
                    const hourGroups = new Map<number, AgentJob[]>();
                    sorted.forEach((agent) => {
                      const hour = getRunHour(agent);
                      if (!hourGroups.has(hour)) hourGroups.set(hour, []);
                      hourGroups.get(hour)!.push(agent);
                    });

                    const sortedKeys = [...hourGroups.keys()].sort((a, b) => {
                      if (a === -1) return 1;
                      if (b === -1) return -1;
                      return a - b;
                    });

                    const maxSlots = 4;
                    const visibleKeys = sortedKeys.slice(0, maxSlots);
                    const overflowCount = sortedKeys.length - maxSlots;

                    return (
                      <>
                        {visibleKeys.map((hour) => {
                          const group = hourGroups.get(hour)!;
                          let timeLabel = "Always";
                          if (hour >= 0) {
                            const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            const ampm = hour >= 12 ? "p" : "a";
                            timeLabel = `${h12}${ampm}`;
                          }

                          return (
                            <div key={hour} className="px-1">
                              <div className="text-[8px] font-mono text-zinc-300 dark:text-zinc-600 mb-0.5">
                                {timeLabel}
                              </div>
                              <div className="flex flex-wrap gap-0.5">
                                {group.map((agent) => {
                                  const agentColor = getAgentColor(agent.name);
                                  return (
                                    <button
                                      key={agent.id}
                                      onClick={(e) => handleAgentClick(e, agent)}
                                      className={`inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-medium border cursor-pointer transition-all hover:brightness-90 dark:hover:brightness-125 truncate max-w-full ${agentColor.bg} ${agentColor.border} ${agentColor.text}`}
                                    >
                                      <span className="truncate">{agent.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {overflowCount > 0 && (
                          <div className="text-[9px] text-zinc-400 dark:text-zinc-500 pl-1 font-medium">
                            +{overflowCount} slots
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Day View ────────────────────────────────────────────────────────────────

function DayView({
  date,
  agents,
  activeFilter,
}: {
  date: Date;
  agents: AgentJob[];
  activeFilter: ScheduleCategory | null;
}) {
  const isDark = useIsDark();
  const [bubble, setBubble] = useState<BubbleData | null>(null);

  const filteredAgents = useMemo(() => {
    const base = activeFilter ? agents.filter((a) => getScheduleCategory(a) === activeFilter) : agents;
    return base.filter((a) => agentRunsOnDay(a, date));
  }, [agents, activeFilter, date]);

  const alwaysRunning = filteredAgents.filter((a) => a.category === "always-running");
  const scheduled = filteredAgents.filter((a) => a.category !== "always-running");

  const closeBubble = useCallback(() => setBubble(null), []);

  function getNextRun(agent: AgentJob): string {
    const parts = agent.schedule.split(" ");
    const minute = parts[0] === "*" ? 0 : parseInt(parts[0]) || 0;
    const hour = parts[1] === "*" ? null : parseInt(parts[1]);
    if (hour !== null) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      return `${h}:${m}`;
    }
    if (parts[0].startsWith("*/")) {
      const interval = parseInt(parts[0].slice(2));
      return `Every ${interval}m`;
    }
    return agent.scheduleDesc || agent.schedule;
  }

  return (
    <>
      {bubble && <AgentBubble data={bubble} isDark={isDark} onClose={closeBubble} />}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {format(date, "EEEE, MMMM d")}
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">
            {filteredAgents.length} agent{filteredAgents.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>

        {/* Always running */}
        {alwaysRunning.length > 0 && (
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600 font-medium mb-2">Always Running</p>
            <div className="space-y-2">
              {alwaysRunning.map((agent) => (
                <button
                  key={agent.id}
                  onClick={(e) => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setBubble({ agent, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900"
                    style={{ backgroundColor: getAgentColor(agent.name, isDark), ringColor: getAgentColor(agent.name, isDark) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{agent.name}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{agent.role || getNextRun(agent)}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono flex-shrink-0">{getNextRun(agent)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled */}
        {scheduled.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-600 font-medium mb-2">Scheduled</p>
            <div className="space-y-2">
              {scheduled.map((agent) => (
                <button
                  key={agent.id}
                  onClick={(e) => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setBubble({ agent, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getAgentColor(agent.name, isDark) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{agent.name}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{agent.role || agent.scheduleDesc}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono flex-shrink-0">{getNextRun(agent)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredAgents.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-600">No agents scheduled for this day</p>
          </div>
        )}
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
  activeFilter: ScheduleCategory | null;
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
    return agents.filter((a) => getScheduleCategory(a) === activeFilter);
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

              {/* Agent cards — consolidated by time slot */}
              <div className="space-y-1.5">
                {(() => {
                  const hourGroups = new Map<number, AgentJob[]>();
                  dayAgents.forEach((agent) => {
                    const hour = getRunHour(agent);
                    if (!hourGroups.has(hour)) hourGroups.set(hour, []);
                    hourGroups.get(hour)!.push(agent);
                  });

                  const sortedKeys = [...hourGroups.keys()].sort((a, b) => {
                    if (a === -1) return 1;
                    if (b === -1) return -1;
                    return a - b;
                  });

                  return sortedKeys.map((hour) => {
                    const group = hourGroups.get(hour)!;
                    let timeLabel = "Always";
                    if (hour >= 0) {
                      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                      const ampm = hour >= 12 ? "PM" : "AM";
                      timeLabel = `${h12}:00 ${ampm}`;
                    }

                    return (
                      <div
                        key={hour}
                        className="rounded-lg border border-zinc-200/50 dark:border-zinc-700/50 bg-zinc-50/50 dark:bg-zinc-900/50 p-1.5"
                      >
                        <div className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 mb-1 px-0.5">
                          {timeLabel}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.map((agent) => {
                            const agentColor = getAgentColor(agent.name);
                            return (
                              <button
                                key={agent.id}
                                onClick={(e) => {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setBubble({ agent, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                                }}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border cursor-pointer transition-all duration-150 hover:brightness-90 dark:hover:brightness-125 ${agentColor.bg} ${agentColor.border} ${agentColor.text}`}
                              >
                                {agent.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
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
  activeFilter: ScheduleCategory | null;
  onFilterToggle: (cat: ScheduleCategory) => void;
}) {
  const isDark = useIsDark();

  // Group agents by category, then show each agent with its unique color
  const categorized = useMemo(() => {
    const cats: ScheduleCategory[] = ["always-running", "daily", "weekly", "manual"];
    return cats
      .map((cat) => ({
        cat,
        label: CATEGORY_LABELS[cat],
        agents: agents
          .filter((a) => getScheduleCategory(a) === cat)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((g) => g.agents.length > 0);
  }, [agents]);

  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sticky top-24">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-4">
        Agents
      </h3>
      <div className="space-y-4">
        {categorized.map(({ cat, label, agents: catAgents }) => {
          const isActive = activeFilter === cat;
          return (
            <div key={cat}>
              <button
                onClick={() => onFilterToggle(cat)}
                className={`w-full flex items-center justify-between px-1.5 py-1 rounded-md text-left transition-all duration-150 mb-1.5 ${
                  isActive
                    ? "bg-zinc-200 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-700"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {label}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  {catAgents.length}
                </span>
              </button>
              <div className="space-y-0.5 pl-1">
                {catAgents.map((agent) => {
                  const color = getAgentColor(agent.name);
                  return (
                    <div key={agent.id} className="flex items-center gap-2 py-0.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color.dot }}
                      />
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                        {agent.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
  const [view, setView] = useState<"daily" | "weekly" | "monthly">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) return "daily";
    return "weekly";
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<ScheduleCategory | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

  function prev() {
    if (view === "daily") setCurrentDate(addDays(currentDate, -1));
    else if (view === "weekly") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  }

  function next() {
    if (view === "daily") setCurrentDate(addDays(currentDate, 1));
    else if (view === "weekly") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  const periodLabel = useMemo(() => {
    if (view === "daily") {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
    if (view === "weekly") {
      const end = addDays(weekStart, 6);
      if (weekStart.getMonth() === end.getMonth()) {
        return `${format(weekStart, "MMMM d")}–${format(end, "d, yyyy")}`;
      }
      return `${format(weekStart, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "MMMM yyyy").toUpperCase();
  }, [view, currentDate, weekStart]);

  const handleFilterToggle = useCallback((cat: ScheduleCategory) => {
    setActiveFilter((prev) => (prev === cat ? null : cat));
  }, []);

  return (
    <div>
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
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

        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <button
            onClick={() => setView("monthly")}
            className={`text-xs px-3 py-1.5 transition-all duration-200 font-medium hidden sm:block ${
              view === "monthly"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView("weekly")}
            className={`text-xs px-3 py-1.5 transition-all duration-200 border-l sm:border-l border-zinc-200 dark:border-zinc-700 font-medium hidden sm:block ${
              view === "weekly"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView("daily")}
            className={`text-xs px-3 py-1.5 transition-all duration-200 border-l border-zinc-200 dark:border-zinc-700 font-medium ${
              view === "daily"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {/* Calendar + Legend layout */}
      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          {view === "daily" ? (
            <DayView
              date={currentDate}
              agents={agents}
              activeFilter={activeFilter}
            />
          ) : view === "weekly" ? (
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
