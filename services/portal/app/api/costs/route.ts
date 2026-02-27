import { NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

// ─── Token prices per 1M tokens (USD) ────────────────────────────────────────
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "anthropic/claude-opus-4-6":   { input: 15.00, output: 75.00, cacheRead: 1.50 },
  "anthropic/claude-sonnet-4-6": { input:  3.00, output: 15.00, cacheRead: 0.30 },
  "anthropic/claude-sonnet-4-5": { input:  3.00, output: 15.00, cacheRead: 0.30 },
  "anthropic/claude-haiku-4-6":  { input:  0.25, output:  1.25, cacheRead: 0.03 },
  "ollama-local/llama3.1:8b":    { input:  0.00, output:  0.00, cacheRead: 0.00 },
};

const COST_LOGS_DIR = "/data/cost-logs";

function calcCost(model: string, tokensIn: number, tokensOut: number, cacheRead: number): number {
  const p = PRICES[model as keyof typeof PRICES] ?? PRICES["anthropic/claude-sonnet-4-6"];
  return (
    (tokensIn   / 1_000_000) * p.input     +
    (tokensOut  / 1_000_000) * p.output    +
    (cacheRead  / 1_000_000) * p.cacheRead
  );
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const CAD_RATE = 1.44;

const SEED_AGENTS = [
  {
    name: "Sauron",
    model: "anthropic/claude-sonnet-4-6",
    tokensIn:  45_000,
    tokensOut:  3_200,
    cacheRead: 120_000,
    runs: 96,
    lastRun: "2026-02-25T17:00:00Z",
    category: "Monitoring",
  },
  {
    name: "Nightly Pipeline",
    model: "anthropic/claude-sonnet-4-6",
    tokensIn:  280_000,
    tokensOut:  12_000,
    cacheRead:       0,
    runs: 1,
    lastRun: "2026-02-25T07:05:00Z",
    category: "Cron Jobs",
  },
  {
    name: "Main Session",
    model: "anthropic/claude-opus-4-6",
    tokensIn:  890_000,
    tokensOut:  45_000,
    cacheRead: 510_000,
    runs: 0, // interactive — no scheduled runs
    lastRun: "2026-02-25T16:50:00Z",
    category: "Interactive",
  },
  {
    name: "Content Harvester",
    model: "anthropic/claude-sonnet-4-6",
    tokensIn:  95_000,
    tokensOut:   8_500,
    cacheRead:  20_000,
    runs: 4,
    lastRun: "2026-02-25T14:00:00Z",
    category: "Content Pipeline",
  },
  {
    name: "Market Analyst",
    model: "anthropic/claude-sonnet-4-6",
    tokensIn:  62_000,
    tokensOut:   5_800,
    cacheRead:  45_000,
    runs: 12,
    lastRun: "2026-02-25T15:30:00Z",
    category: "AI/Analysis",
  },
  {
    name: "Digest Builder",
    model: "anthropic/claude-haiku-4-6",
    tokensIn:  180_000,
    tokensOut:  22_000,
    cacheRead:       0,
    runs: 48,
    lastRun: "2026-02-25T16:00:00Z",
    category: "Content Pipeline",
  },
  {
    name: "Health Monitor",
    model: "anthropic/claude-haiku-4-6",
    tokensIn:   8_000,
    tokensOut:   1_000,
    cacheRead:   5_000,
    runs: 288,
    lastRun: "2026-02-25T17:10:00Z",
    category: "Monitoring",
  },
  {
    name: "DB Maintenance",
    model: "anthropic/claude-sonnet-4-6",
    tokensIn:  30_000,
    tokensOut:   2_500,
    cacheRead:  10_000,
    runs: 2,
    lastRun: "2026-02-25T03:00:00Z",
    category: "Maintenance",
  },
];

function buildAgents() {
  return SEED_AGENTS.map(a => {
    const costUSD = parseFloat(calcCost(a.model, a.tokensIn, a.tokensOut, a.cacheRead).toFixed(4));
    return {
      name: a.name,
      model: a.model,
      tokensIn: a.tokensIn,
      tokensOut: a.tokensOut,
      cacheRead: a.cacheRead,
      costUSD,
      costCAD: parseFloat((costUSD * CAD_RATE).toFixed(4)),
      runs: a.runs,
      lastRun: a.lastRun,
      category: a.category,
    };
  });
}

const DAILY_SEED = [
  { date: "2026-02-19", costUSD:  2.10, runs:  45 },
  { date: "2026-02-20", costUSD:  5.30, runs: 120 },
  { date: "2026-02-21", costUSD:  8.90, runs: 180 },
  { date: "2026-02-22", costUSD: 11.20, runs: 210 },
  { date: "2026-02-23", costUSD: 15.40, runs: 280 },
  { date: "2026-02-24", costUSD:  9.80, runs: 190 },
  { date: "2026-02-25", costUSD: 12.45, runs: 220 },
];

const CATEGORY_SEED = [
  { category: "Interactive",      costUSD: 4.13  },
  { category: "Cron Jobs",        costUSD: 1.02  },
  { category: "Content Pipeline", costUSD: 2.46  },
  { category: "AI/Analysis",      costUSD: 0.72  },
  { category: "Monitoring",       costUSD: 0.24  },
  { category: "Maintenance",      costUSD: 0.10  },
];

// ─── Load real cost log data ──────────────────────────────────────────────────

interface CostEntry {
  timestamp: string;
  agent: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  cost: number;
  type: string;
}

function loadRealCostData(): { entries: CostEntry[]; dailyMap: Map<string, CostEntry[]> } | null {
  try {
    if (!existsSync(COST_LOGS_DIR)) return null;
    const files = readdirSync(COST_LOGS_DIR).filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/));
    if (files.length === 0) return null;

    const dailyMap = new Map<string, CostEntry[]>();
    const allEntries: CostEntry[] = [];

    for (const file of files) {
      const date = file.replace(".json", "");
      const raw = readFileSync(join(COST_LOGS_DIR, file), "utf-8");
      const entries: CostEntry[] = JSON.parse(raw);
      dailyMap.set(date, entries);
      allEntries.push(...entries);
    }

    return { entries: allEntries, dailyMap };
  } catch {
    return null;
  }
}

function agentCategoryFromType(type: string, agent: string): string {
  if (type === "main") return "Interactive";
  if (type === "cron") {
    if (agent.includes("sauron") || agent.includes("monitor") || agent.includes("watchdog") || agent.includes("supervisor")) return "Monitoring";
    if (agent.includes("backup") || agent.includes("retention")) return "Maintenance";
    if (agent.includes("pipeline") || agent.includes("scrape") || agent.includes("caption") || agent.includes("content") || agent.includes("youtube")) return "Content Pipeline";
    return "Cron Jobs";
  }
  if (type === "subagent") {
    if (agent.includes("scrape") || agent.includes("transcript") || agent.includes("content") || agent.includes("youtube") || agent.includes("caption")) return "Content Pipeline";
    if (agent.includes("security") || agent.includes("scorpion") || agent.includes("persona")) return "AI/Analysis";
    return "Cron Jobs";
  }
  return "Cron Jobs";
}

export async function GET() {
  let cadRate = CAD_RATE;
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } });
    if (r.ok) {
      const fx = await r.json();
      cadRate = fx?.rates?.CAD ?? CAD_RATE;
    }
  } catch { /* fallback */ }

  const realData = loadRealCostData();

  if (realData && realData.entries.length > 0) {
    // Build agent aggregates from real data
    const agentMap = new Map<string, { model: string; tokensIn: number; tokensOut: number; cacheRead: number; runs: number; lastRun: string; category: string }>();
    
    for (const e of realData.entries) {
      const existing = agentMap.get(e.agent);
      if (existing) {
        existing.tokensIn += e.input_tokens;
        existing.tokensOut += e.output_tokens;
        existing.cacheRead += e.cache_tokens;
        existing.runs += 1;
        if (e.timestamp > existing.lastRun) {
          existing.lastRun = e.timestamp;
          existing.model = e.model;
        }
      } else {
        agentMap.set(e.agent, {
          model: e.model,
          tokensIn: e.input_tokens,
          tokensOut: e.output_tokens,
          cacheRead: e.cache_tokens,
          runs: 1,
          lastRun: e.timestamp,
          category: agentCategoryFromType(e.type, e.agent),
        });
      }
    }

    const agents = [...agentMap.entries()].map(([name, a]) => {
      const costUSD = parseFloat(calcCost(a.model, a.tokensIn, a.tokensOut, a.cacheRead).toFixed(4));
      return {
        name,
        model: a.model,
        tokensIn: a.tokensIn,
        tokensOut: a.tokensOut,
        cacheRead: a.cacheRead,
        costUSD,
        costCAD: parseFloat((costUSD * cadRate).toFixed(4)),
        runs: a.runs,
        lastRun: a.lastRun,
        category: a.category,
      };
    }).sort((a, b) => b.costUSD - a.costUSD);

    // Daily breakdown
    const daily = [...realData.dailyMap.entries()]
      .map(([date, entries]) => {
        const dayCost = entries.reduce((s, e) => s + calcCost(e.model, e.input_tokens, e.output_tokens, e.cache_tokens), 0);
        return {
          date,
          costUSD: parseFloat(dayCost.toFixed(2)),
          costCAD: parseFloat((dayCost * cadRate).toFixed(2)),
          runs: entries.length,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const a of agents) {
      catMap.set(a.category, (catMap.get(a.category) || 0) + a.costUSD);
    }
    const totalCatCost = [...catMap.values()].reduce((s, c) => s + c, 0);
    const categories = [...catMap.entries()].map(([category, costUSD]) => ({
      category,
      costUSD: parseFloat(costUSD.toFixed(2)),
      costCAD: parseFloat((costUSD * cadRate).toFixed(2)),
      pct: parseFloat(((costUSD / (totalCatCost || 1)) * 100).toFixed(1)),
    })).sort((a, b) => b.costUSD - a.costUSD);

    const totalTokensIn = agents.reduce((s, a) => s + a.tokensIn, 0);
    const totalTokensOut = agents.reduce((s, a) => s + a.tokensOut, 0);
    const totalCostUSD = parseFloat(agents.reduce((s, a) => s + a.costUSD, 0).toFixed(4));
    const weeklyUSD = parseFloat(daily.reduce((s, d) => s + d.costUSD, 0).toFixed(2));
    const BUDGET_USD = 100;

    return NextResponse.json({
      period: new Date().toISOString().split("T")[0],
      cadRate,
      resetTime: "Thursday 07:00 AM PST",
      totalTokensIn,
      totalTokensOut,
      totalCostUSD,
      totalCostCAD: parseFloat((totalCostUSD * cadRate).toFixed(4)),
      weeklyUSD,
      weeklyCAD: parseFloat((weeklyUSD * cadRate).toFixed(2)),
      budgetUSD: BUDGET_USD,
      budgetUsedPct: Math.min(100, Math.round((weeklyUSD / BUDGET_USD) * 100)),
      agents,
      daily,
      categories,
      dataSource: "real",
    });
  }

  // ─── Fallback to seed data ──────────────────────────────────────────────────
  const agents = buildAgents();
  const totalTokensIn  = agents.reduce((s, a) => s + a.tokensIn, 0);
  const totalTokensOut = agents.reduce((s, a) => s + a.tokensOut, 0);
  const totalCostUSD   = parseFloat(agents.reduce((s, a) => s + a.costUSD, 0).toFixed(4));
  const weekly = DAILY_SEED.reduce((s, d) => s + d.costUSD, 0);
  const BUDGET_USD = 100;

  return NextResponse.json({
    period: "2026-02-25",
    cadRate,
    resetTime: "Thursday 07:00 AM PST",
    totalTokensIn,
    totalTokensOut,
    totalCostUSD,
    totalCostCAD: parseFloat((totalCostUSD * cadRate).toFixed(4)),
    weeklyUSD: parseFloat(weekly.toFixed(2)),
    weeklyCAD: parseFloat((weekly * cadRate).toFixed(2)),
    budgetUSD: BUDGET_USD,
    budgetUsedPct: Math.min(100, Math.round((weekly / BUDGET_USD) * 100)),
    agents,
    daily: DAILY_SEED.map(d => ({ ...d, costCAD: parseFloat((d.costUSD * cadRate).toFixed(2)) })),
    categories: CATEGORY_SEED.map(c => ({
      ...c,
      costCAD: parseFloat((c.costUSD * cadRate).toFixed(2)),
      pct: parseFloat(((c.costUSD / CATEGORY_SEED.reduce((s, x) => s + x.costUSD, 0)) * 100).toFixed(1)),
    })),
    dataSource: "seed",
  });
}
