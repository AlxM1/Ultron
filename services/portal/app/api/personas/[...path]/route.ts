import { NextRequest, NextResponse } from "next/server";

const PERSONA_ENGINE = process.env.PERSONA_ENGINE_URL || "http://raiser-persona-engine:3017";

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = (await params).path.join("/");
  const url = `${PERSONA_ENGINE}/api/persona/${path}`;

  try {
    const opts: RequestInit = {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(300000),
    };
    if (req.method === "POST" || req.method === "PUT") {
      opts.body = await req.text();
    }
    const res = await fetch(url, opts);

    // Handle binary responses (audio from /speak endpoints)
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("audio/") || contentType.includes("application/octet-stream")) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: res.status,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": res.headers.get("content-disposition") || "inline",
          ...(res.headers.get("x-persona-text") ? { "X-Persona-Text": res.headers.get("x-persona-text")! } : {}),
          ...(res.headers.get("x-persona-source") ? { "X-Persona-Source": res.headers.get("x-persona-source")! } : {}),
        },
      });
    }

    // JSON responses
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error("Persona proxy error:", e);
    return NextResponse.json({ error: "Persona engine unreachable" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
