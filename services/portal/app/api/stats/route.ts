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

// Services to health-check (mirrors HealthPanel.tsx)
const HEALTH_URLS: { id: string; url: string }[] = [
  { id: "agentsmith-frontend", url: "http://raiser-agentsmith-frontend:3000" },
  { id: "agentsmith-admin", url: "http://raiser-agentsmith-admin:3001" },
  { id: "outline", url: "http://raiser-outline:3000/api/auth.info" },
  { id: "cortex", url: "http://raiser-cortex:3011/health" },
  { id: "content-intel", url: "http://raiser-content-intel:3015/health" },
  { id: "krya", url: "http://raiser-krya:3000" },
  { id: "agentsmith-backend", url: "http://raiser-agentsmith-backend:4000/health" },
  { id: "youtubedl", url: "http://raiser-youtubedl:8000/health" },
  { id: "newsletter", url: "http://raiser-newsletter-pipeline:8000/health" },
  { id: "apify", url: "http://raiser-apify:8000/health" },
  { id: "persona", url: "http://raiser-persona-pipeline:8500/health" },
  { id: "whisperflow", url: "http://raiser-whisperflow:8766/health" },
  { id: "searxng", url: "http://raiser-searxng:8080" },
  { id: "authentik", url: "http://raiser-authentik-server:9000/-/health/ready/" },
  { id: "voiceforge", url: "http://localhost:8001/health" },
  { id: "portal", url: "http://localhost:3020" },
  { id: "gpu-tts", url: "http://10.25.10.60:8001/health" },
];

// Non-HTTP services assumed online
const NON_HTTP_COUNT = 2; // postgres, redis

async function countHealthyServices(): Promise<number> {
  const results = await Promise.all(
    HEALTH_URLS.map(async (svc) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(svc.url, {
          signal: controller.signal,
          headers: { "User-Agent": "00raiser-Portal" },
        });
        clearTimeout(timeout);
        return res.ok;
      } catch {
        return false;
      }
    })
  );
  return results.filter(Boolean).length + NON_HTTP_COUNT;
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

  // Run content-intel stats and health checks concurrently
  const [contentData, healthyCount] = await Promise.all([
    (async () => {
      try {
        const data = await tryFetch(`${CONTENT_INTEL_URL}/api/stats`, {
          "X-API-Key": API_KEY,
        });
        if (data) return data;

        const [creators, transcripts, content] = await Promise.all([
          tryFetch(`${CONTENT_INTEL_URL}/api/creators?limit=1`, { "X-API-Key": API_KEY }),
          tryFetch(`${CONTENT_INTEL_URL}/api/transcripts?limit=1`, { "X-API-Key": API_KEY }),
          tryFetch(`${CONTENT_INTEL_URL}/api/content?limit=1`, { "X-API-Key": API_KEY }),
        ]);
        return { creators, transcripts, content, _fallback: true };
      } catch {
        return null;
      }
    })(),
    countHealthyServices(),
  ]);

  if (contentData) {
    if (contentData._fallback) {
      if (contentData.creators) stats.totalCreators = contentData.creators.total ?? contentData.creators.count ?? (Array.isArray(contentData.creators) ? contentData.creators.length : 0);
      if (contentData.transcripts) stats.totalTranscripts = contentData.transcripts.total ?? contentData.transcripts.count ?? (Array.isArray(contentData.transcripts) ? contentData.transcripts.length : 0);
      if (contentData.content) stats.totalContent = contentData.content.total ?? contentData.content.count ?? (Array.isArray(contentData.content) ? contentData.content.length : 0);
    } else {
      stats.totalCreators = contentData.total_creators ?? contentData.creators ?? 0;
      stats.totalTranscripts = contentData.total_transcripts ?? contentData.transcripts ?? 0;
      stats.totalContent = contentData.total_content ?? contentData.content_items ?? 0;
      stats.todayCost = contentData.today_cost ?? 0;
    }
  }

  stats.healthyServices = healthyCount;

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
