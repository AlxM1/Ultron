// AgentCalendar.tsx — Daily schedule view for all 16 cron agents

"use client";

import StatusBadge, { StatusType } from "./StatusBadge";

export interface AgentSchedule {
  id: string;
  name: string;
  schedule: string;
  scheduleDesc: string;
  lastRun: string | null;
  nextRun: string | null;
  status: StatusType;
  duration?: string;
  errorCount7d: number;
}

interface AgentCalendarProps {
  agents: AgentSchedule[];
}

// Format UTC time string nicely
function fmtTime(iso: string | null): string {
  if (!iso) return "--";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hour12: false,
    }) + " UTC";
  } catch {
    return iso;
  }
}

export default function AgentCalendar({ agents }: AgentCalendarProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Agent
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Schedule
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Last Run
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Next Run
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Status
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Duration
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              Errors (7d)
            </th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent, i) => (
            <tr
              key={agent.id}
              className={`border-b border-zinc-100 dark:border-zinc-800/60 transition-colors duration-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${
                i % 2 === 0 ? "" : "bg-zinc-50/50 dark:bg-zinc-900/30"
              }`}
            >
              <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                {agent.name}
              </td>
              <td className="py-3 px-4 font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {agent.scheduleDesc}
              </td>
              <td className="py-3 px-4 font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {fmtTime(agent.lastRun)}
              </td>
              <td className="py-3 px-4 font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {fmtTime(agent.nextRun)}
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                <StatusBadge status={agent.status} />
              </td>
              <td className="py-3 px-4 font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {agent.duration ?? "--"}
              </td>
              <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap">
                <span
                  className={
                    agent.errorCount7d > 0
                      ? "text-red-600 dark:text-red-400 font-medium"
                      : "text-zinc-400 dark:text-zinc-600"
                  }
                >
                  {agent.errorCount7d}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
