import { NextRequest, NextResponse } from "next/server";

// Map localhost ports to Docker service names for container-internal health checks
const PORT_TO_SERVICE: Record<string, string> = {
  "3000": "raiser-agentsmith-frontend:3000",
  "3001": "raiser-agentsmith-admin:3001",
  "3010": "raiser-outline:3000",
  "3011": "raiser-cortex:3011",
  "3015": "raiser-content-intel:3015",
  "3100": "raiser-krya:3000",
  "4000": "raiser-agentsmith-backend:4000",
  "8200": "raiser-youtubedl:8000",
  "8300": "raiser-newsletter-pipeline:8000",
  "8400": "raiser-apify:8000",
  "8500": "raiser-persona-pipeline:8500",
  "8766": "raiser-whisperflow:8766",
  "8888": "raiser-searxng:8080",
  "9000": "raiser-authentik-server:9000",
  "9443": "raiser-authentik-server:9443",
};

function rewriteUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      const mapping = PORT_TO_SERVICE[parsed.port];
      if (mapping) {
        const [host, port] = mapping.split(":");
        parsed.hostname = host;
        parsed.port = port;
        return parsed.toString();
      }
    }
    return url;
  } catch {
    return url;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const internalUrl = rewriteUrl(url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(internalUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "00raiser-Portal" },
    });

    clearTimeout(timeoutId);

    return NextResponse.json({
      online: response.ok,
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json({
      online: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
