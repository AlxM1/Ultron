import { NextRequest, NextResponse } from "next/server";

const PERSONA_ENGINE = process.env.PERSONA_ENGINE_URL || "http://raiser-persona-engine:3017";

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = (await params).path.join("/");
  const url = `${PERSONA_ENGINE}/api/persona/${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  try {
    const opts: RequestInit = {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(60000),
    };
    if (req.method === "POST" || req.method === "PUT") {
      opts.body = await req.text();
    }
    const res = await fetch(url, opts);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error("Persona proxy error:", e);
    return NextResponse.json({ error: "Persona engine unreachable" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
