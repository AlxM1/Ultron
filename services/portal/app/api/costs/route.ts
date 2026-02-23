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

    // Parse Summary sheet (daily aggregates with cumulative)
    const summarySheet = wb.Sheets["Summary"];
    const summaryRaw: any[] = summarySheet ? XLSX.utils.sheet_to_json(summarySheet) : [];

    // Parse Daily Log (granular per agent/model)
    const dailyLogSheet = wb.Sheets["Daily Log"];
    const dailyLogRaw: any[] = dailyLogSheet ? XLSX.utils.sheet_to_json(dailyLogSheet) : [];

    // Parse By Model sheet
    const modelSheet = wb.Sheets["By Model"];
    const modelRaw: any[] = modelSheet ? XLSX.utils.sheet_to_json(modelSheet) : [];

    // Parse By Agent sheet
    const agentSheet = wb.Sheets["By Agent"];
    const agentRaw: any[] = agentSheet ? XLSX.utils.sheet_to_json(agentSheet) : [];

    // Parse Daily sheet (per-day per-agent)
    const dailySheet = wb.Sheets["Daily"];
    const dailyRaw: any[] = dailySheet ? XLSX.utils.sheet_to_json(dailySheet) : [];

    // Build daily trend from Summary
    const dailyTrend = summaryRaw.map(r => ({
      date: String(r["Date"] || ""),
      tokens: Number(r["Total Tokens"] || 0),
      cost: Math.round(Number(r["Total Cost"] || 0) * 100) / 100,
      cumulative: Math.round(Number(r["Cumulative Cost"] || 0) * 100) / 100,
    })).filter(d => d.date);

    // Model breakdown from By Model sheet
    const totalModelCost = modelRaw.reduce((s, r) => s + Number(r["Total Cost"] || 0), 0);
    const modelBreakdown = modelRaw
      .map(r => {
        const cost = Number(r["Total Cost"] || 0);
        return {
          model: String(r["Model"] || "unknown").replace("anthropic/", "").replace("openai/", "").replace("ollama-local/", ""),
          fullModel: String(r["Model"] || "unknown"),
          cost: Math.round(cost * 100) / 100,
          tokens: Number(r["Total Input"] || 0) + Number(r["Total Output"] || 0) + Number(r["Cache Tokens"] || 0),
          pct: totalModelCost > 0 ? Math.round((cost / totalModelCost) * 1000) / 10 : 0,
        };
      })
      .filter(m => m.cost > 0 || m.tokens > 0)
      .sort((a, b) => b.cost - a.cost);

    // Agent breakdown from By Agent sheet
    const totalAgentCost = agentRaw.reduce((s, r) => s + Number(r["Total Cost"] || 0), 0);
    const agentBreakdown = agentRaw
      .map(r => {
        const cost = Number(r["Total Cost"] || 0);
        return {
          agent: String(r["Agent"] || "unknown"),
          cost: Math.round(cost * 100) / 100,
          tokens: Number(r["Total Tokens"] || 0),
          pct: totalAgentCost > 0 ? Math.round((cost / totalAgentCost) * 1000) / 10 : 0,
        };
      })
      .filter(a => a.cost > 0 || a.tokens > 0)
      .sort((a, b) => b.cost - a.cost);

    // Totals
    const totalCost = dailyTrend.length > 0 ? dailyTrend[dailyTrend.length - 1].cumulative : 0;
    const totalTokens = dailyTrend.reduce((s, d) => s + d.tokens, 0);

    const stat = fs.statSync(LEDGER_PATH);

    return NextResponse.json({
      updatedAt: stat.mtime.toISOString(),
      totalCost: Math.round(totalCost * 100) / 100,
      totalTokens,
      dailyTrend,
      modelBreakdown,
      agentBreakdown,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
