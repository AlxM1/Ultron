import { NextResponse } from "next/server";

const CONTENT_INTEL_URL = process.env.CONTENT_INTEL_INTERNAL_URL || "http://raiser-content-intel:3015";
const API_KEY = process.env.CONTENT_INTEL_API_KEY || "";

async function tryFetch(url: string, headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return res.json();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export async function GET() {
  let stats = {
    totalCreators: 0,
    totalTranscripts: 0,
    totalContent: 0,
    activeAgents: 17,
    todayCost: 0,
    healthyServices: 0,
    totalServices: 19,
  };

  try {
    const data = await tryFetch(`${CONTENT_INTEL_URL}/api/stats`, {
      "X-API-Key": API_KEY,
    });

    if (data) {
      stats = {
        totalCreators: data.total_creators ?? data.creators ?? 0,
        totalTranscripts: data.total_transcripts ?? data.transcripts ?? 0,
        totalContent: data.total_content ?? data.content_items ?? 0,
        activeAgents: 17,
        todayCost: data.today_cost ?? 0,
        healthyServices: 0,
        totalServices: 19,
      };
    } else {
      // Try individual endpoints
      const [creators, transcripts, content] = await Promise.all([
        tryFetch(`${CONTENT_INTEL_URL}/api/creators?limit=1`, { "X-API-Key": API_KEY }),
        tryFetch(`${CONTENT_INTEL_URL}/api/transcripts?limit=1`, { "X-API-Key": API_KEY }),
        tryFetch(`${CONTENT_INTEL_URL}/api/content?limit=1`, { "X-API-Key": API_KEY }),
      ]);

      if (creators) stats.totalCreators = creators.total ?? creators.count ?? (Array.isArray(creators) ? creators.length : 0);
      if (transcripts) stats.totalTranscripts = transcripts.total ?? transcripts.count ?? (Array.isArray(transcripts) ? transcripts.length : 0);
      if (content) stats.totalContent = content.total ?? content.count ?? (Array.isArray(content) ? content.length : 0);
    }
  } catch {
    // Return defaults
  }

  // Try cost data from mounted volume
  try {
    const { readdir, readFile } = await import("fs/promises");
    const costDir = "/data/cost-logs";
    const today = new Date().toISOString().split("T")[0];
    const files = await readdir(costDir).catch(() => [] as string[]);
    const todayFile = files.find((f) => f.includes(today));
    if (todayFile) {
      const raw = await readFile(`${costDir}/${todayFile}`, "utf-8");
      const lines = raw.split("\n").filter(Boolean);
      let cost = 0;
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          cost += entry.cost_usd ?? entry.cost ?? 0;
        } catch {}
      }
      stats.todayCost = cost;
    }
  } catch {}

  return NextResponse.json(stats);
}
