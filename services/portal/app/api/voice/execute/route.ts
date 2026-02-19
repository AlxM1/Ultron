import { NextResponse } from "next/server";

const KRYA_URL = process.env.KRYA_URL || "http://raiser-krya:3000";
const YOUTUBEDL_URL = process.env.YOUTUBEDL_URL || "http://raiser-youtubedl:8000";
const SCRAPER_URL = process.env.SCRAPER_URL || "http://raiser-apify:8400";
const BRIDGE_URL = process.env.TASK_BRIDGE_URL || "http://raiser-agent-bridge:3011";
const PERSONA_URL = process.env.PERSONA_URL || "http://raiser-persona-pipeline:8500";

async function executeAction(action: Record<string, unknown>) {
  switch (action.type) {
    case "open_app":
      return { type: "open_app", app: action.app };

    case "generate_image": {
      const res = await fetch(`${KRYA_URL}/api/generate/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: action.prompt,
          width: action.width || 1024,
          height: action.height || 1024,
        }),
        signal: AbortSignal.timeout(15000),
      });
      return { type: "generate_image", result: await res.json() };
    }

    case "generate_video": {
      const res = await fetch(`${KRYA_URL}/api/generate/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: action.prompt,
          width: action.width || 832,
          height: action.height || 480,
        }),
        signal: AbortSignal.timeout(15000),
      });
      return { type: "generate_video", result: await res.json() };
    }

    case "download_video": {
      const res = await fetch(`${YOUTUBEDL_URL}/api/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: action.url, format_id: "best" }),
        signal: AbortSignal.timeout(10000),
      });
      return { type: "download_video", result: await res.json() };
    }

    case "get_tasks": {
      const res = await fetch(`${BRIDGE_URL}/api/tasks/dashboard`, {
        signal: AbortSignal.timeout(5000),
      });
      return { type: "get_tasks", result: await res.json() };
    }

    case "scrape": {
      const res = await fetch(`${SCRAPER_URL}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: action.url,
          platform: action.platform || "web",
        }),
        signal: AbortSignal.timeout(10000),
      });
      return { type: "scrape", result: await res.json() };
    }

    case "persona_chat": {
      const slug = action.persona || "jason-calacanis";
      const res = await fetch(`${PERSONA_URL}/api/personas/${slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: action.message }),
        signal: AbortSignal.timeout(30000),
      });
      return { type: "persona_chat", persona: slug, result: await res.json() };
    }

    case "persona_script": {
      const slug = action.persona || "jason-calacanis";
      const res = await fetch(`${PERSONA_URL}/api/personas/${slug}/generate-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: action.topic,
          duration_minutes: action.minutes || 5,
          style: action.style || "monologue",
        }),
        signal: AbortSignal.timeout(60000),
      });
      return { type: "persona_script", persona: slug, result: await res.json() };
    }

    case "list_personas": {
      const res = await fetch(`${PERSONA_URL}/api/personas`, {
        signal: AbortSignal.timeout(10000),
      });
      return { type: "list_personas", result: await res.json() };
    }

    default:
      return { type: action.type, error: "Unknown action type" };
  }
}

export async function POST(req: Request) {
  try {
    const { action } = await req.json();
    if (!action) {
      return NextResponse.json({ error: "No action provided" }, { status: 400 });
    }

    const result = await executeAction(action);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Execute error:", e);
    return NextResponse.json(
      { error: "Action execution failed" },
      { status: 500 }
    );
  }
}
