import { NextResponse } from "next/server";

const PERSONA_ENGINE = process.env.PERSONA_ENGINE_URL || "http://raiser-persona-engine:3017";

export async function GET() {
  try {
    const res = await fetch(`${PERSONA_ENGINE}/api/persona`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error("Persona list error:", e);
    return NextResponse.json(
      { error: "Persona engine unreachable" },
      { status: 502 }
    );
  }
}
