// Shared constants for INotion pages
// Extracted to avoid duplication across agent and audit pages

// --- Agent constants ---

export const CATEGORY_COLORS: Record<string, string> = {
  "always-running":
    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  daily:
    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  weekly:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
};

// --- Audit constants ---

export const DIMENSION_LABELS: Record<string, string> = {
  ai_citability: "AI Citability",
  schema_readiness: "Schema Readiness",
  eeat_signals: "E-E-A-T Signals",
  content_structure: "Content Structure",
  platform_visibility: "Platform Visibility",
};

export const DIMENSION_COLORS: Record<string, string> = {
  ai_citability: "#f59e0b",
  schema_readiness: "#3b82f6",
  eeat_signals: "#22c55e",
  content_structure: "#a855f7",
  platform_visibility: "#ef4444",
};

export const PRIORITY_ORDER = ["critical", "high", "medium", "low"] as const;

export const PRIORITY_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  critical: {
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.4)",
    text: "#ef4444",
  },
  high: {
    bg: "rgba(234,179,8,0.15)",
    border: "rgba(234,179,8,0.4)",
    text: "#eab308",
  },
  medium: {
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.4)",
    text: "#3b82f6",
  },
  low: {
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.4)",
    text: "#22c55e",
  },
};
