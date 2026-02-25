import { NextResponse } from "next/server";

// 17 autonomous agents with their cron schedules
// Categories: always-running (blue), daily (green), weekly (purple)
export const AGENTS = [
  {
    id: "health-monitor",
    name: "Health Monitor",
    role: "System watchdog — monitors all container health",
    schedule: "*/5 * * * *",
    scheduleDesc: "Every 5 min",
    category: "always-running",
    model: "script",
    activeSince: "2024-10-01",
    description: "Pings all services every 5 minutes and writes health state to disk.",
  },
  {
    id: "cortex-monitor",
    name: "Cortex Monitor",
    role: "Task bridge heartbeat and queue monitor",
    schedule: "*/10 * * * *",
    scheduleDesc: "Every 10 min",
    category: "always-running",
    model: "script",
    activeSince: "2024-10-01",
    description: "Monitors task queue depth and worker health on the Cortex bridge.",
  },
  {
    id: "agentsmith-orchestrator",
    name: "AgentSmith Orchestrator",
    role: "Workflow trigger and execution manager",
    schedule: "*/15 * * * *",
    scheduleDesc: "Every 15 min",
    category: "always-running",
    model: "claude-sonnet-4-6",
    activeSince: "2024-10-15",
    description: "Scans pending tasks, triggers N8N workflows, reports completions.",
  },
  {
    id: "inotion-sync",
    name: "INotion Sync",
    role: "Knowledge base sync and indexing",
    schedule: "0 */2 * * *",
    scheduleDesc: "Every 2 hours",
    category: "always-running",
    model: "script",
    activeSince: "2024-11-01",
    description: "Syncs Outline collections, rebuilds document index, updates metadata.",
  },
  {
    id: "cost-tracker",
    name: "Cost Tracker",
    role: "API spend monitor and budget enforcer",
    schedule: "0 */6 * * *",
    scheduleDesc: "Every 6 hours",
    category: "always-running",
    model: "script",
    activeSince: "2024-10-15",
    description: "Aggregates API costs across all models and writes daily cost logs.",
  },
  {
    id: "memory-consolidation",
    name: "Memory Consolidation",
    role: "Session memory cleanup and MEMORY.md updater",
    schedule: "0 1 * * *",
    scheduleDesc: "Daily 1:00 AM",
    category: "daily",
    model: "claude-opus-4-6",
    activeSince: "2024-10-01",
    description: "Reviews daily notes, extracts key insights, updates MEMORY.md and daily logs.",
  },
  {
    id: "content-scraper",
    name: "Content Scraper",
    role: "Creator content harvester via Apify",
    schedule: "0 2 * * *",
    scheduleDesc: "Daily 2:00 AM",
    category: "daily",
    model: "script",
    activeSince: "2024-11-15",
    description: "Runs Apify scrapers for all tracked creators. Saves raw content to DB.",
  },
  {
    id: "youtube-downloader",
    name: "YouTube Downloader",
    role: "New video fetcher and audio extractor",
    schedule: "30 2 * * *",
    scheduleDesc: "Daily 2:30 AM",
    category: "daily",
    model: "script",
    activeSince: "2024-11-15",
    description: "Checks for new uploads from tracked channels, downloads audio tracks.",
  },
  {
    id: "transcript-processor",
    name: "Transcript Processor",
    role: "WhisperFlow batch transcription runner",
    schedule: "0 3 * * *",
    scheduleDesc: "Daily 3:00 AM",
    category: "daily",
    model: "whisper-large-v3",
    activeSince: "2024-11-20",
    description: "Sends downloaded audio to WhisperFlow, stores transcripts in DB.",
  },
  {
    id: "security-audit",
    name: "Security Audit",
    role: "Nightly security hardening check",
    schedule: "0 4 * * *",
    scheduleDesc: "Daily 4:00 AM",
    category: "daily",
    model: "claude-opus-4-6",
    activeSince: "2024-10-01",
    description: "Runs security health checks, firewall audits, credential exposure scan.",
  },
  {
    id: "backup-system",
    name: "Backup System",
    role: "Critical data backup manager",
    schedule: "30 4 * * *",
    scheduleDesc: "Daily 4:30 AM",
    category: "daily",
    model: "script",
    activeSince: "2024-10-15",
    description: "Backs up PostgreSQL databases, workspace config, and Outline data.",
  },
  {
    id: "newsletter-pipeline",
    name: "Newsletter Pipeline",
    role: "Daily newsletter generation and delivery",
    schedule: "0 6 * * *",
    scheduleDesc: "Daily 6:00 AM",
    category: "daily",
    model: "claude-sonnet-4-6",
    activeSince: "2024-12-01",
    description: "Generates personalized newsletter from daily content harvest, sends to list.",
  },
  {
    id: "creator-intelligence",
    name: "Creator Intelligence",
    role: "Creator analysis and scoring engine",
    schedule: "0 8 * * *",
    scheduleDesc: "Daily 8:00 AM",
    category: "daily",
    model: "claude-sonnet-4-6",
    activeSince: "2024-11-01",
    description: "Analyzes new content, updates creator scores, extracts topics and themes.",
  },
  {
    id: "persona-pipeline",
    name: "Persona Pipeline",
    role: "AI persona training and knowledge update",
    schedule: "0 10 * * *",
    scheduleDesc: "Daily 10:00 AM",
    category: "daily",
    model: "claude-sonnet-4-6",
    activeSince: "2024-12-15",
    description: "Updates persona knowledge base with latest creator transcripts and insights.",
  },
  {
    id: "performance-metrics",
    name: "Performance Metrics",
    role: "Daily KPI aggregator and reporter",
    schedule: "0 0 * * *",
    scheduleDesc: "Daily midnight",
    category: "daily",
    model: "script",
    activeSince: "2024-10-01",
    description: "Computes daily KPIs: tasks run, success rates, costs, creators processed.",
  },
  {
    id: "roadmap-updates",
    name: "Roadmap Updates",
    role: "Weekly milestone tracker and planner",
    schedule: "0 9 * * 1",
    scheduleDesc: "Monday 9:00 AM",
    category: "weekly",
    model: "claude-opus-4-6",
    activeSince: "2024-10-01",
    description: "Reviews completed milestones, updates roadmap.json, plans next sprint.",
  },
  {
    id: "content-intel-weekly",
    name: "Content Intel Weekly",
    role: "Weekly content strategy report",
    schedule: "0 11 * * 1",
    scheduleDesc: "Monday 11:00 AM",
    category: "weekly",
    model: "claude-opus-4-6",
    activeSince: "2024-11-01",
    description: "Produces weekly content intelligence report: top creators, trending topics, opportunities.",
  },
];

// Simple cron parser: returns array of hours (0-23) on which the job runs for a given day
// Returns null if the job doesn't run on that day of week (0=Sun, 6=Sat)
function cronRunsOnDOW(schedule: string, dow: number): number[] | null {
  const parts = schedule.split(" ");
  if (parts.length < 5) return null;
  const [minutePart, hourPart, , , weekdayPart] = parts;

  // Check weekday constraint
  if (weekdayPart !== "*") {
    const weekdays = weekdayPart.split(",").map(Number);
    if (!weekdays.includes(dow)) return null;
  }

  // Compute run hours
  if (hourPart === "*") {
    // Runs every hour
    if (minutePart.startsWith("*/")) {
      const step = parseInt(minutePart.slice(2));
      // Return all 24 hours since it runs every step minutes
      return Array.from({ length: 24 }, (_, i) => i);
    }
    return Array.from({ length: 24 }, (_, i) => i);
  }

  if (hourPart.startsWith("*/")) {
    const step = parseInt(hourPart.slice(2));
    const hours = [];
    for (let h = 0; h < 24; h += step) hours.push(h);
    return hours;
  }

  return hourPart.split(",").map(Number);
}

export async function GET() {
  // Try to get run history from Cortex/content-intel
  // For now return the static agent list with computed next/last run times
  const now = new Date();

  const agents = AGENTS.map((agent) => {
    const parts = agent.schedule.split(" ");
    const minutePart = parts[0];
    const hourPart = parts[1];
    const weekdayPart = parts[4];

    // Compute last and next run times (approximate)
    const lastRun = new Date(now);
    const nextRun = new Date(now);

    if (weekdayPart !== "*") {
      // Weekly job
      const targetDOW = parseInt(weekdayPart);
      const currentDOW = now.getDay();
      const daysAgo = ((currentDOW - targetDOW + 7) % 7) || 7;
      lastRun.setDate(lastRun.getDate() - daysAgo);
      const daysUntil = ((targetDOW - currentDOW + 7) % 7) || 7;
      nextRun.setDate(nextRun.getDate() + daysUntil);
      if (!hourPart.startsWith("*/") && hourPart !== "*") {
        const hour = parseInt(hourPart.split(",")[0]);
        lastRun.setHours(hour, 0, 0, 0);
        nextRun.setHours(hour, 0, 0, 0);
      }
    } else if (hourPart.startsWith("*/")) {
      const step = parseInt(hourPart.slice(2));
      const currentHour = now.getHours();
      const lastHour = Math.floor(currentHour / step) * step;
      lastRun.setHours(lastHour, 0, 0, 0);
      nextRun.setHours(lastHour + step, 0, 0, 0);
    } else if (hourPart !== "*") {
      const hour = parseInt(hourPart.split(",")[0]);
      if (now.getHours() >= hour) {
        lastRun.setHours(hour, 0, 0, 0);
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(hour, 0, 0, 0);
      } else {
        lastRun.setDate(lastRun.getDate() - 1);
        lastRun.setHours(hour, 0, 0, 0);
        nextRun.setHours(hour, 0, 0, 0);
      }
    } else {
      // Every N minutes
      const step = minutePart.startsWith("*/") ? parseInt(minutePart.slice(2)) : 1;
      const msStep = step * 60 * 1000;
      const msLast = Math.floor(now.getTime() / msStep) * msStep;
      lastRun.setTime(msLast);
      nextRun.setTime(msLast + msStep);
    }

    return {
      ...agent,
      lastRun: lastRun.toISOString(),
      nextRun: nextRun.toISOString(),
      status: "active" as const,
      errorCount7d: 0,
    };
  });

  return NextResponse.json({ agents });
}
