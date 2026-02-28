import { NextResponse } from "next/server";

// Real autonomous agents from openclaw cron list
// Categories: always-running (blue), daily (green), weekly (purple), manual (gray)
export const AGENTS = [
  {
    id: "cost-ledger-update",
    name: "Cost Ledger Update",
    role: "API spend tracker",
    schedule: "*/5 * * * *",
    scheduleDesc: "Every 5 min",
    category: "always-running",
    model: "script",
    activeSince: "2026-02-01",
    description: "Tracks API spend every 5 minutes across all model providers and writes to the cost ledger.",
  },
  {
    id: "autonomous-coordinator",
    name: "Autonomous Coordinator",
    role: "Sub-agent task queue orchestrator",
    schedule: "*/30 * * * *",
    scheduleDesc: "Every 30 min",
    category: "always-running",
    model: "claude-sonnet-4-6",
    activeSince: "2026-02-01",
    description: "Coordinates sub-agent task queues and spawns next batches of autonomous work.",
  },
  {
    id: "healthcheck-15m",
    name: "Healthcheck",
    role: "System health monitor",
    schedule: "*/15 * * * *",
    scheduleDesc: "Every 15 min",
    category: "always-running",
    model: "claude-sonnet-4-6",
    activeSince: "2026-02-01",
    description: "System health monitoring every 15 minutes — checks containers, services, disk, and connectivity.",
  },
  {
    id: "self-audit-6h",
    name: "Self Audit",
    role: "Workspace and operations auditor",
    schedule: "0 */6 * * *",
    scheduleDesc: "Every 6 hours",
    category: "always-running",
    model: "claude-sonnet-4-6",
    activeSince: "2026-02-01",
    description: "Self-audit of workspace and operations every 6 hours — checks for drift, stale files, and inconsistencies.",
  },
  {
    id: "guardian-security-scan",
    name: "Guardian Security Scan",
    role: "Security hardening scanner",
    schedule: "0 */6 * * *",
    scheduleDesc: "Every 6 hours",
    category: "always-running",
    model: "claude-sonnet-4-6",
    activeSince: "2026-02-01",
    description: "Security hardening scan every 6 hours — firewall rules, open ports, credential exposure, SSH config.",
  },
  {
    id: "reddit-intel-scan",
    name: "Reddit Intel Scan",
    role: "Reddit keyword and creator intelligence",
    schedule: "0 */6 * * *",
    scheduleDesc: "Every 6 hours",
    category: "always-running",
    model: "claude-sonnet-4-6",
    activeSince: "2026-02-01",
    description: "Reddit keyword and creator intelligence scan — monitors relevant subreddits for mentions and trends.",
  },
  {
    id: "daily-verification-reset",
    name: "Daily Verification Reset",
    role: "Identity verification state manager",
    schedule: "0 0 * * *",
    scheduleDesc: "Daily midnight",
    category: "daily",
    model: "script",
    activeSince: "2026-02-01",
    description: "Resets verification state at midnight to enforce daily re-authentication.",
  },
  {
    id: "nightly-caption-pipeline",
    name: "Nightly Caption Pipeline",
    role: "YouTube caption downloader",
    schedule: "0 2 * * *",
    scheduleDesc: "Daily 2:00 AM",
    category: "daily",
    model: "script",
    activeSince: "2026-02-01",
    description: "Downloads YouTube captions for all tracked creators and loads them into the database.",
  },
  {
    id: "nightly-batch-comments",
    name: "Nightly Batch Comments",
    role: "YouTube comment scraper",
    schedule: "30 2 * * *",
    scheduleDesc: "Daily 2:30 AM",
    category: "daily",
    model: "script",
    activeSince: "2026-02-01",
    description: "Batch scrapes YouTube comments for tracked videos and stores them for analysis.",
  },
  {
    id: "daily-backup",
    name: "Daily Backup",
    role: "Critical data backup manager",
    schedule: "0 3 * * *",
    scheduleDesc: "Daily 3:00 AM",
    category: "daily",
    model: "script",
    activeSince: "2026-02-01",
    description: "PostgreSQL + workspace backup to USB/NAS/git — ensures full recoverability.",
  },
  {
    id: "nightly-date-backfill",
    name: "Nightly Date Backfill",
    role: "Content record date patcher",
    schedule: "30 3 * * *",
    scheduleDesc: "Daily 3:30 AM",
    category: "daily",
    model: "script",
    activeSince: "2026-02-01",
    description: "Backfills missing publish dates on content records from YouTube and other sources.",
  },
  {
    id: "data-retention-dry-run",
    name: "Data Retention Dry Run",
    role: "Retention policy auditor",
    schedule: "0 4 * * 0",
    scheduleDesc: "Sunday 4:00 AM",
    category: "weekly",
    model: "claude-sonnet-4-6",
    activeSince: "2026-02-01",
    description: "Dry-run data retention policy on Sundays — identifies what would be pruned without deleting.",
  },
  {
    id: "nightly-inotion-stats",
    name: "Nightly INotion Stats",
    role: "Platform stats publisher",
    schedule: "0 4 * * *",
    scheduleDesc: "Daily 4:00 AM",
    category: "daily",
    model: "script",
    activeSince: "2026-02-01",
    description: "Pushes platform stats to INotion wiki so Alex can see operational metrics in the dashboard.",
  },
  {
    id: "memory-auto-prune",
    name: "Memory Auto Prune",
    role: "Memory file lifecycle manager",
    schedule: "0 4 * * 0",
    scheduleDesc: "Sunday 4:00 AM",
    category: "weekly",
    model: "claude-sonnet-4-6",
    activeSince: "2026-02-01",
    description: "Prunes old memory files on Sundays — archives stale daily notes and trims logs.",
  },
  {
    id: "openclaw-self-improve",
    name: "Self Improvement",
    role: "Continuous improvement engine",
    schedule: "0 7 * * *",
    scheduleDesc: "Daily 7:00 AM",
    category: "daily",
    model: "claude-sonnet-4-6",
    activeSince: "2026-02-01",
    description: "Self-improvement cycle — reviews mistakes.md, processes learnings, and updates operational patterns.",
  },
  {
    id: "daily-content-digest",
    name: "Daily Content Digest",
    role: "Content intelligence reporter",
    schedule: "0 8 * * *",
    scheduleDesc: "Daily 8:00 AM",
    category: "daily",
    model: "claude-sonnet-4-6",
    activeSince: "2026-02-01",
    description: "Generates daily content intelligence digest — trending topics, creator activity, and opportunities.",
  },
  {
    id: "alex-intervention-rem",
    name: "Alex Intervention Reminder",
    role: "One-time intervention reminder",
    schedule: "22 06 27 02 *",
    scheduleDesc: "One-time (expired)",
    category: "manual",
    model: "script",
    activeSince: "2026-02-01",
    description: "One-time intervention reminder — expired. Kept for audit trail.",
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
