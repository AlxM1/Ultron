import { NextRequest, NextResponse } from "next/server";

const CONTENT_INTEL_URL = process.env.CONTENT_INTEL_INTERNAL_URL || "http://raiser-content-intel:3015";
const API_KEY = process.env.CONTENT_INTEL_API_KEY || "";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") || "/api/creators";
  
  try {
    const res = await fetch(`${CONTENT_INTEL_URL}${path}`, {
      headers: { "X-API-Key": API_KEY },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") || "";
  const body = await request.json();
  
  try {
    const res = await fetch(`${CONTENT_INTEL_URL}${path}`, {
      method: "PATCH",
      headers: { 
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
