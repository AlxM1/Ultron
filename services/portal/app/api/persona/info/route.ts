import { NextResponse } from "next/server";

const PERSONA_URL = process.env.PERSONA_URL || "http://raiser-persona-pipeline:8500";

export async function GET() {
  try {
    const res = await fetch(
      `${PERSONA_URL}/api/personas/jason-calacanis`,
      { signal: AbortSignal.timeout(10000) }
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("Persona info error:", e);
    return NextResponse.json(
      { error: "Persona info fetch failed" },
      { status: 500 }
    );
  }
}
