import { NextResponse } from "next/server";
import { fetchPersonaEngine } from "../../_lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchPersonaEngine("/api/persona/board/members");
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "Persona engine unreachable" }, { status: 502 });
  }
}
