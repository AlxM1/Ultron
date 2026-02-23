import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import fs from "fs";

const LEDGER_PATH = process.env.COST_LEDGER_PATH || "/data/costs/cost-ledger.xlsx";

export async function GET() {
  try {
    if (!fs.existsSync(LEDGER_PATH)) {
      return NextResponse.json({ error: "Ledger not found" }, { status: 404 });
    }

    const buf = fs.readFileSync(LEDGER_PATH);
    const wb = XLSX.read(buf, { type: "buffer" });

    const summaryRaw: any[] = XLSX.utils.sheet_to_json(wb.Sheets["Summary"] || {});
    const modelRaw: any[] = XLSX.utils.sheet_to_json(wb.Sheets["By Model"] || {});
    const agentRaw: any[] = XLSX.utils.sheet_to_json(wb.Sheets["By Agent"] || {});

    const dailyTrend = summaryRaw.map(r => ({
      date: String(r["Date"] || ""),
      tokens: Number(r["Total Tokens"] || 0),
      cost: Math.round(Number(r["Total Cost"] || 0) * 100) / 100,
      cumulative: Math.round(Number(r["Cumulative Cost"] || 0) * 100) / 100,
    })).filter(d => d.date);

    const totalCost = dailyTrend.length > 0 ? dailyTrend[dailyTrend.length - 1].cumulative : 0;
    const totalTokens = dailyTrend.reduce((s, d) => s + d.tokens, 0);
    const todayCost = dailyTrend.length > 0 ? dailyTrend[dailyTrend.length - 1].cost : 0;
    const avgDaily = dailyTrend.length > 0 ? totalCost / dailyTrend.length : 0;
    const totalModelCost = modelRaw.reduce((s, r) => s + Number(r["Total Cost"] || 0), 0);

    const modelData = modelRaw.map(r => ({
      name: String(r["Model"] || "").replace("anthropic/", "").replace("openai/", "").replace("ollama-local/", ""),
      cost: Math.round(Number(r["Total Cost"] || 0) * 100) / 100,
      tokens: Number(r["Total Input"] || 0) + Number(r["Total Output"] || 0) + Number(r["Cache Tokens"] || 0),
      pct: totalModelCost > 0 ? Math.round((Number(r["Total Cost"] || 0) / totalModelCost) * 1000) / 10 : 0,
    })).filter(m => m.cost > 0 || m.tokens > 0).sort((a, b) => b.cost - a.cost);

    const totalAgentCost = agentRaw.reduce((s, r) => s + Number(r["Total Cost"] || 0), 0);
    const agentData = agentRaw.map(r => ({
      name: String(r["Agent"] || ""),
      cost: Math.round(Number(r["Total Cost"] || 0) * 100) / 100,
      tokens: Number(r["Total Tokens"] || 0),
      pct: totalAgentCost > 0 ? Math.round((Number(r["Total Cost"] || 0) / totalAgentCost) * 1000) / 10 : 0,
    })).filter(a => a.cost > 0 || a.tokens > 0).sort((a, b) => b.cost - a.cost);

    const fmtCost = (v: number) => `$${v.toFixed(2)}`;
    const fmtTok = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(1)}K` : String(v);

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const deck = {
      title: "AI Operations — Cost Report",
      subtitle: "Infrastructure Cost Intelligence",
      author: "00Raiser",
      date: dateStr,
      slides: [
        {
          id: "cover",
          layout: "cover",
          bg: "gradient",
          content: {
            type: "hero",
            badge: "LIVE DATA · AUTO-UPDATING · FEBRUARY 2026",
            title: "Cost Intelligence Report",
            subtitle: `February 2026 — ${dailyTrend.length} days tracked · ${fmtCost(totalCost)} total spend · ${fmtTok(totalTokens)} tokens processed`,
          },
        },
        {
          id: "kpis",
          layout: "content",
          bg: "dark",
          content: {
            type: "stats",
            heading: "Key Performance Indicators",
            stats: [
              { label: "Total Spend (MTD)", value: fmtCost(totalCost), icon: "💰", color: "#4af3ff" },
              { label: "Today's Spend", value: fmtCost(todayCost), icon: "📊" },
              { label: "Daily Average", value: fmtCost(avgDaily), icon: "📈" },
              { label: "Total Tokens", value: fmtTok(totalTokens), icon: "⚡" },
            ],
            caption: `Data as of ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} PST`,
          },
        },
        {
          id: "cumulative",
          layout: "content",
          bg: "dark",
          content: {
            type: "chart",
            heading: "Cumulative Spend Over Time",
            chartType: "area",
            chartData: dailyTrend,
            chartConfig: { dataKey: "cumulative", xKey: "date" },
            caption: "Cumulative cost trend across all models and agents",
          },
        },
        {
          id: "daily-spend",
          layout: "content",
          bg: "dark",
          content: {
            type: "chart",
            heading: "Daily Spend Breakdown",
            chartType: "bar",
            chartData: dailyTrend.map(d => ({ name: d.date, cost: d.cost })),
            chartConfig: { dataKey: "cost" },
            caption: "Day-by-day operational cost",
          },
        },
        {
          id: "model-split",
          layout: "content",
          bg: "gradient",
          content: {
            type: "split",
            left: {
              type: "chart",
              heading: "Cost by Model",
              chartType: "pie",
              chartData: modelData,
              chartConfig: { dataKey: "cost", nameKey: "name" },
            },
            right: {
              type: "chart",
              heading: "Token Usage by Model",
              chartType: "horizontal-bar",
              chartData: modelData,
              chartConfig: { dataKey: "tokens", nameKey: "name" },
            },
          },
        },
        {
          id: "model-table",
          layout: "content",
          bg: "dark",
          content: {
            type: "table",
            heading: "Model Cost Details",
            headers: ["Model", "Cost", "Tokens", "Share %"],
            rows: modelData.map(m => [m.name, fmtCost(m.cost), fmtTok(m.tokens), `${m.pct}%`]),
          },
        },
        {
          id: "agent-breakdown",
          layout: "content",
          bg: "gradient",
          content: {
            type: "split",
            left: {
              type: "chart",
              heading: "Cost by Agent",
              chartType: "pie",
              chartData: agentData,
              chartConfig: { dataKey: "cost", nameKey: "name" },
            },
            right: {
              type: "chart",
              heading: "Agent Token Usage",
              chartType: "bar",
              chartData: agentData,
              chartConfig: { dataKey: "tokens", nameKey: "name" },
            },
          },
        },
        {
          id: "agent-table",
          layout: "content",
          bg: "dark",
          content: {
            type: "table",
            heading: "Agent Cost Details",
            headers: ["Agent", "Cost", "Tokens", "Share %"],
            rows: agentData.map(a => [a.name, fmtCost(a.cost), fmtTok(a.tokens), `${a.pct}%`]),
          },
        },
        {
          id: "token-volume",
          layout: "content",
          bg: "dark",
          content: {
            type: "chart",
            heading: "Daily Token Volume",
            chartType: "area",
            chartData: dailyTrend.map(d => ({ name: d.date, tokens: d.tokens })),
            chartConfig: { dataKey: "tokens" },
            caption: "Token throughput over time",
          },
        },
        {
          id: "insights",
          layout: "content",
          bg: "gradient",
          content: {
            type: "text",
            heading: "Key Insights",
            bullets: [
              `Sonnet handles ${modelData.find(m => m.name.includes("sonnet"))?.pct || 0}% of total cost — efficient routing for sub-agents and cron`,
              `Opus accounts for ${modelData.find(m => m.name.includes("opus"))?.pct || 0}% — used only for main conversation and security tasks`,
              `Llama 3.1 8B runs locally at $0.00 — free compute for simple tasks`,
              `Sub-agents are the largest cost center at ${agentData.find(a => a.name === "subagent")?.pct || 0}% — consider batching where possible`,
              `Average daily burn: ${fmtCost(avgDaily)} — projected monthly: ${fmtCost(avgDaily * 30)}`,
              `All data auto-refreshes every 5 minutes from the live Excel ledger`,
            ],
          },
        },
        {
          id: "closing",
          layout: "cover",
          bg: "gradient",
          content: {
            type: "hero",
            badge: "00RAISER INFRASTRUCTURE",
            title: "Building Smart. Building Lean.",
            subtitle: "Self-hosted AI infrastructure with intelligent model routing. Full cost transparency, zero waste.",
          },
        },
      ],
    };

    return NextResponse.json(deck);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
