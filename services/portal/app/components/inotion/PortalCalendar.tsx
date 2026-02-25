"use client";

import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface AgentJob {
  id: string;
  name: string;
  schedule: string;
  scheduleDesc: string;
  category: "always-running" | "daily" | "weekly";
  status?: "active" | "failed" | "pending";
}

interface PortalCalendarProps {
  agents: AgentJob[];
  onJobClick?: (job: AgentJob) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  "always-running": {
    bg: "bg-blue-500/15 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    border: "border-blue-500/30",
  },
  daily: {
    bg: "bg-emerald-500/15 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    border: "border-emerald-500/30",
  },
  weekly: {
    bg: "bg-purple-500/15 dark:bg-purple-500/20",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
    border: "border-purple-500/30",
  },
};

// Determine if an agent runs on a given day (0=Sun ... 6=Sat)
function agentRunsOnDay(agent: AgentJob, date: Date): boolean {
  const parts = agent.schedule.split(" ");
  if (parts.length < 5) return false;
  const weekdayPart = parts[4];

  if (weekdayPart !== "*") {
    const targetDOW = parseInt(weekdayPart);
    return date.getDay() === targetDOW;
  }
  return true; // runs every day
}

// Get the run hour for display
function getRunHour(agent: AgentJob): string {
  const parts = agent.schedule.split(" ");
  if (parts.length < 5) return "";
  const minutePart = parts[0];
  const hourPart = parts[1];

  if (hourPart === "*" && minutePart.startsWith("*/")) {
    return `every ${minutePart.slice(2)}m`;
  }
  if (hourPart.startsWith("*/")) {
    return `every ${hourPart.slice(2)}h`;
  }
  if (hourPart !== "*") {
    const h = parseInt(hourPart.split(",")[0]);
    const m = minutePart.startsWith("*/") ? "00" : minutePart.padStart(2, "0");
    return `${h.toString().padStart(2, "0")}:${m}`;
  }
  return agent.scheduleDesc;
}

// ─── Weekly View ─────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  agents,
  onJobClick,
}: {
  weekStart: Date;
  agents: AgentJob[];
  onJobClick?: (job: AgentJob) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
      {days.map((day) => {
        const dayAgents = agents.filter((a) => agentRunsOnDay(a, day));
        const isCurrentDay = isToday(day);

        return (
          <div
            key={day.toISOString()}
            className={`bg-white dark:bg-zinc-900 min-h-[160px] p-2 flex flex-col ${
              isCurrentDay ? "ring-2 ring-inset ring-blue-500/30 dark:ring-blue-400/30" : ""
            }`}
          >
            {/* Day header */}
            <div className="mb-2 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {format(day, "EEE")}
              </div>
              <div
                className={`text-sm font-bold mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isCurrentDay
                    ? "bg-blue-500 text-white"
                    : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {format(day, "d")}
              </div>
            </div>

            {/* Job pills */}
            <div className="space-y-0.5 overflow-y-auto flex-1">
              {dayAgents.slice(0, 8).map((agent) => {
                const colors = CATEGORY_COLORS[agent.category];
                const hour = getRunHour(agent);
                return (
                  <button
                    key={agent.id}
                    onClick={() => onJobClick?.(agent)}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium ${colors.bg} ${colors.text} border ${colors.border} hover:brightness-110 transition-all truncate`}
                    title={`${agent.name} — ${agent.scheduleDesc}`}
                  >
                    {hour && <span className="opacity-60 mr-1">{hour}</span>}
                    {agent.name}
                  </button>
                );
              })}
              {dayAgents.length > 8 && (
                <div className="text-[9px] text-zinc-400 dark:text-zinc-500 text-center pt-0.5">
                  +{dayAgents.length - 8} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Monthly View ─────────────────────────────────────────────────────────────

function MonthView({
  month,
  agents,
  onJobClick,
}: {
  month: Date;
  agents: AgentJob[];
  onJobClick?: (job: AgentJob) => void;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = addDays(startOfWeek(addDays(monthEnd, 6), { weekStartsOn: 0 }), 6);
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const DOW_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      {/* DOW headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {calDays.map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const dayAgents = agents.filter((a) => agentRunsOnDay(a, day));
          const isCurrentDay = isToday(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);

          // Count by category
          const alwaysCount = dayAgents.filter((a) => a.category === "always-running").length;
          const dailyCount = dayAgents.filter((a) => a.category === "daily").length;
          const weeklyCount = dayAgents.filter((a) => a.category === "weekly").length;

          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDay(isSameDay(day, selectedDay as Date) ? null : day)}
              className={`bg-white dark:bg-zinc-900 p-2 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80 min-h-[80px] ${
                !inMonth ? "opacity-30" : ""
              } ${isSelected ? "ring-2 ring-inset ring-blue-500/50" : ""}`}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-semibold inline-flex items-center justify-center w-5 h-5 rounded-full ${
                    isCurrentDay
                      ? "bg-blue-500 text-white text-[10px]"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {dayAgents.length > 0 && (
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {dayAgents.length}
                  </span>
                )}
              </div>

              {/* Category dots */}
              {inMonth && dayAgents.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {alwaysCount > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {alwaysCount > 1 && <span className="text-[8px] text-blue-500 font-mono">{alwaysCount}</span>}
                    </div>
                  )}
                  {dailyCount > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {dailyCount > 1 && <span className="text-[8px] text-emerald-500 font-mono">{dailyCount}</span>}
                    </div>
                  )}
                  {weeklyCount > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {weeklyCount > 1 && <span className="text-[8px] text-purple-500 font-mono">{weeklyCount}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="mt-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
            {format(selectedDay, "EEEE, MMMM d")} — {agents.filter((a) => agentRunsOnDay(a, selectedDay!)).length} jobs
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {agents
              .filter((a) => agentRunsOnDay(a, selectedDay!))
              .map((agent) => {
                const colors = CATEGORY_COLORS[agent.category];
                return (
                  <button
                    key={agent.id}
                    onClick={() => onJobClick?.(agent)}
                    className={`text-left px-3 py-2 rounded-lg border ${colors.bg} ${colors.border} hover:brightness-105 transition-all`}
                  >
                    <div className={`text-xs font-semibold ${colors.text}`}>{agent.name}</div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{agent.scheduleDesc}</div>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Calendar Component ──────────────────────────────────────────────────

export default function PortalCalendar({ agents, onJobClick }: PortalCalendarProps) {
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState<AgentJob | null>(null);

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
    return format(currentDate, "MMMM yyyy");
  }, [view, currentDate, weekStart]);

  const handleJobClick = (job: AgentJob) => {
    setSelectedJob(job === selectedJob ? null : job);
    onJobClick?.(job);
  };

  return (
    <div>
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{periodLabel}</h2>
          <button
            onClick={goToday}
            className="text-xs px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 mr-3">
            {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
              <div key={cat} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 capitalize">
                  {cat.replace("-", " ")}
                </span>
              </div>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <button
              onClick={() => setView("weekly")}
              className={`text-xs px-3 py-1.5 transition-colors ${
                view === "weekly"
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView("monthly")}
              className={`text-xs px-3 py-1.5 transition-colors border-l border-zinc-200 dark:border-zinc-700 ${
                view === "monthly"
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              Month
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={prev}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={next}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar view */}
      {view === "weekly" ? (
        <WeekView weekStart={weekStart} agents={agents} onJobClick={handleJobClick} />
      ) : (
        <MonthView month={currentDate} agents={agents} onJobClick={handleJobClick} />
      )}

      {/* Selected job detail panel */}
      {selectedJob && (
        <div className="mt-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[selectedJob.category].dot}`} />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{selectedJob.name}</h3>
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mb-2">
                {selectedJob.schedule} — {selectedJob.scheduleDesc}
              </div>
              {(selectedJob as any).description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{(selectedJob as any).description}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedJob(null)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs ml-4"
            >
              Dismiss
            </button>
          </div>
          {(selectedJob as any).model && (selectedJob as any).model !== "script" && (
            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Model: </span>
              <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">{(selectedJob as any).model}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
