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

// Generate synthetic heatmap data based on agent schedules
// 17 agents: 5 always-running (every few mins), 10 daily, 2 weekly
function generateActivity(): DayActivity[] {
  const end = new Date();
  const start = subYears(end, 1);
  const days = eachDayOfInterval({ start, end });

  return days.map((day) => {
    const dow = day.getDay(); // 0=Sun
    // Always-running agents: run every day (contribute ~48 runs/day combined)
    const alwaysRunning = 48;
    // Daily agents: run every day
    const daily = 10;
    // Weekly: only Mondays
    const weekly = dow === 1 ? 2 : 0;

    const base = alwaysRunning + daily + weekly;
    // Add some realistic variance
    const noise = Math.floor(Math.random() * 8) - 3;
    const count = Math.max(0, base + noise);

    return { date: format(day, "yyyy-MM-dd"), count };
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
