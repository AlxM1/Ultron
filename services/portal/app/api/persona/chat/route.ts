import { NextResponse } from "next/server";

const PERSONA_URL = process.env.PERSONA_URL || "http://raiser-persona-pipeline:8500";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const res = await fetch(
      `${PERSONA_URL}/api/personas/jason-calacanis/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(30000),
      }
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("Persona chat error:", e);
    return NextResponse.json(
      { error: "Persona chat failed" },
      { status: 500 }
    );
  }
}
