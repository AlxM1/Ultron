import { NextResponse } from "next/server";

const PERSONA_ENGINE_URL =
  process.env.PERSONA_ENGINE_URL || "http://localhost:3017";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const name = url.searchParams.get("name");
    if (!name) {
      return NextResponse.json(
        { error: "name query param required" },
        { status: 400 }
      );
    }

    const { question } = await req.json();
    if (!question) {
      return NextResponse.json(
        { error: "question required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${PERSONA_ENGINE_URL}/api/persona/${encodeURIComponent(name)}/speak`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: AbortSignal.timeout(180000),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "TTS failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "X-Persona-Text": res.headers.get("X-Persona-Text") || "",
        "X-Persona-Source": res.headers.get("X-Persona-Source") || "",
      },
    });
  } catch (e) {
    console.error("Persona speak error:", e);
    return NextResponse.json(
      { error: "Persona speak failed" },
      { status: 500 }
    );
  }
}
