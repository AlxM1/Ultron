"use client";

import { useMemo } from "react";
import { format, eachDayOfInterval, subYears, isToday } from "date-fns";

interface DayActivity {
  date: string;  // YYYY-MM-DD
  count: number; // number of agent runs
}

interface ActivityHeatmapProps {
  data?: DayActivity[];
}

// Generate realistic heatmap data matching the system's actual timeline.
// System went live ~Feb 19, 2026. Before that: no activity.
function generateActivity(): DayActivity[] {
  const end = new Date();
  const start = subYears(end, 1);
  const days = eachDayOfInterval({ start, end });

  // Milestone: system went live Feb 19, 2026
  const goLive = new Date(2026, 1, 19); // month is 0-indexed
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Deterministic seed based on date string
  function seededRandom(seed: string): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    }
    return ((h & 0x7fffffff) % 1000) / 1000;
  }

  return days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");

    // Future days: no data
    if (day > today) {
      return { date: dateStr, count: 0 };
    }

    // Before go-live: no activity
    if (day < goLive) {
      return { date: dateStr, count: 0 };
    }

    const daysSinceLaunch = Math.floor(
      (day.getTime() - goLive.getTime()) / 86400000
    );
    const dow = day.getDay();
    const rand = seededRandom(dateStr);

    if (daysSinceLaunch <= 1) {
      // Feb 19-20: initial setup, light activity (5-15 runs)
      const base = 5 + Math.floor(rand * 10);
      return { date: dateStr, count: base };
    }

    // Feb 21+: ramping up as more agents come online
    // Ramp factor: starts at ~0.3, reaches 1.0 by day 7
    const rampFactor = Math.min(1, 0.3 + (daysSinceLaunch - 2) * 0.1);

    // Base activity: always-running (~48) + daily (~10) + weekly on Mon (~2)
    const alwaysRunning = Math.floor(48 * rampFactor);
    const daily = Math.floor(10 * rampFactor);
    const weekly = dow === 1 ? Math.floor(2 * rampFactor) : 0;

    const base = alwaysRunning + daily + weekly;
    const noise = Math.floor(rand * 10) - 4;
    const count = Math.max(1, base + noise);

    return { date: dateStr, count };
  });
}

function getColor(count: number, max: number): string {
  if (count === 0) return "bg-zinc-100 dark:bg-zinc-800";
  const intensity = count / max;
  if (intensity < 0.25) return "bg-emerald-200 dark:bg-emerald-900";
  if (intensity < 0.5) return "bg-emerald-400 dark:bg-emerald-700";
  if (intensity < 0.75) return "bg-emerald-500 dark:bg-emerald-600";
  return "bg-emerald-600 dark:bg-emerald-500";
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const activityData = useMemo(() => data ?? generateActivity(), [data]);

  const maxCount = useMemo(() => Math.max(...activityData.map((d) => d.count), 1), [activityData]);

  // Build week columns
  const weeks = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const d of activityData) byDate[d.date] = d.count;

    const end = new Date();
    const start = subYears(end, 1);
    const days = eachDayOfInterval({ start, end });

    // Pad start to Sunday
    const firstDay = days[0];
    const padDays = firstDay.getDay(); // 0=Sun
    const paddedDays = [
      ...Array.from({ length: padDays }, (_, i) => null),
      ...days,
    ];

    const weekCols: (Date | null)[][] = [];
    for (let i = 0; i < paddedDays.length; i += 7) {
      weekCols.push(paddedDays.slice(i, i + 7) as (Date | null)[]);
    }

    return { weekCols, byDate };
  }, [activityData]);

  const totalRuns = activityData.reduce((sum, d) => sum + d.count, 0);
  const activeDays = activityData.filter((d) => d.count > 0).length;

  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DOW_LABELS = ["Sun", "", "Tue", "", "Thu", "", "Sat"];

  // Get month label positions
  const monthPositions = useMemo(() => {
    const positions: { month: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.weekCols.forEach((week, colIdx) => {
      const firstDate = week.find((d) => d !== null);
      if (firstDate) {
        const m = firstDate.getMonth();
        if (m !== lastMonth) {
          positions.push({ month: MONTH_LABELS[m], col: colIdx });
          lastMonth = m;
        }
      }
    });
    return positions;
  }, [weeks.weekCols]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          {totalRuns.toLocaleString()} agent runs &bull; {activeDays} active days
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">
          <span>Less</span>
          {["bg-zinc-100 dark:bg-zinc-800", "bg-emerald-200 dark:bg-emerald-900", "bg-emerald-400 dark:bg-emerald-700", "bg-emerald-500 dark:bg-emerald-600", "bg-emerald-600 dark:bg-emerald-500"].map((cls, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex gap-0" style={{ minWidth: "fit-content" }}>
          {/* Day of week labels */}
          <div className="flex flex-col gap-px mr-1">
            <div className="h-4" /> {/* Month label spacer */}
            {DOW_LABELS.map((label, i) => (
              <div key={i} className="h-2.5 flex items-center">
                {label && (
                  <span className="text-[8px] text-zinc-400 dark:text-zinc-500 w-6">{label}</span>
                )}
              </div>
            ))}
          </div>

          {/* Week columns with month labels */}
          <div>
            {/* Month labels row */}
            <div className="flex h-4 mb-px">
              {weeks.weekCols.map((_, colIdx) => {
                const pos = monthPositions.find((p) => p.col === colIdx);
                return (
                  <div key={colIdx} className="w-2.5 flex-shrink-0">
                    {pos && (
                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{pos.month}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grid */}
            <div className="flex gap-px">
              {weeks.weekCols.map((week, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-px">
                  {week.map((day, rowIdx) => {
                    if (!day) {
                      return <div key={rowIdx} className="w-2.5 h-2.5 rounded-sm" />;
                    }
                    const dateStr = format(day, "yyyy-MM-dd");
                    const count = weeks.byDate[dateStr] ?? 0;
                    const colorClass = getColor(count, maxCount);
                    const title = `${format(day, "MMM d, yyyy")}: ${count} agent runs`;

                    return (
                      <div
                        key={rowIdx}
                        className={`w-2.5 h-2.5 rounded-sm ${colorClass} ${
                          isToday(day) ? "ring-1 ring-blue-500 ring-offset-0" : ""
                        } cursor-default transition-opacity hover:opacity-80`}
                        title={title}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
