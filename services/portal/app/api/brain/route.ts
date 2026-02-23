import { NextRequest, NextResponse } from "next/server";

const CORTEX_URL = process.env.CORTEX_INTERNAL_URL || "http://raiser-cortex:3011";
const API_KEY = process.env.CORTEX_API_KEY || "";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") || "/api/tasks";
  
  try {
    const res = await fetch(`${CORTEX_URL}${path}`, {
      headers: { "X-API-Key": API_KEY },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
