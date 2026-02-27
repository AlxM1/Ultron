import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Known services with their internal health endpoints
const SERVICES = [
  { name: "raiser-portal", image: "portal", port: "3020", url: "http://localhost:3020" },
  { name: "raiser-cortex", image: "cortex", port: "3011", url: "http://raiser-cortex:3011/health" },
  { name: "raiser-content-intel", image: "content-intel", port: "3015", url: "http://raiser-content-intel:3015/health" },
  { name: "raiser-outline", image: "outline", port: "3000", url: "http://raiser-outline:3000/api/auth.info" },
  { name: "raiser-agentsmith-frontend", image: "agentsmith-frontend", port: "3000", url: "http://raiser-agentsmith-frontend:3000" },
  { name: "raiser-agentsmith-admin", image: "agentsmith-admin", port: "3001", url: "http://raiser-agentsmith-admin:3001" },
  { name: "raiser-agentsmith-backend", image: "agentsmith-backend", port: "4000", url: "http://raiser-agentsmith-backend:4000/health" },
  { name: "raiser-krya", image: "krya", port: "3000", url: "http://raiser-krya:3000" },
  { name: "raiser-youtubedl", image: "youtubedl", port: "8000", url: "http://raiser-youtubedl:8000/health" },
  { name: "raiser-newsletter-pipeline", image: "newsletter-pipeline", port: "8000", url: "http://raiser-newsletter-pipeline:8000/health" },
  { name: "raiser-apify", image: "apify", port: "8000", url: "http://raiser-apify:8000/health" },
  { name: "raiser-persona-pipeline", image: "persona-pipeline", port: "8500", url: "http://raiser-persona-pipeline:8500/health" },
  { name: "raiser-whisperflow", image: "whisperflow", port: "8766", url: "http://raiser-whisperflow:8766/health" },
  { name: "raiser-searxng", image: "searxng", port: "8080", url: "http://raiser-searxng:8080" },
  { name: "raiser-authentik-server", image: "authentik", port: "9000", url: "http://raiser-authentik-server:9000/-/health/ready/" },
  { name: "raiser-postgres", image: "postgres", port: "5432", url: null },
  { name: "raiser-redis", image: "redis", port: "6379", url: null },
];

async function checkHealth(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "00raiser-Portal" },
    });
    clearTimeout(timeout);
    return res.status < 500;
  } catch {
    return false;
  }
}

export async function GET() {
  const results = await Promise.all(
    SERVICES.map(async (svc) => {
      let status = "Up (assumed)";
      if (svc.url) {
        const healthy = await checkHealth(svc.url);
        status = healthy ? "Up" : "Down";
      }
      return {
        name: svc.name,
        status: `${status}`,
        image: svc.image,
        ports: svc.port,
      };
    })
  );

  return NextResponse.json({ containers: results });
}
