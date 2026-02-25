import { NextRequest, NextResponse } from "next/server";

const CONTENT_INTEL_URL = process.env.CONTENT_INTEL_INTERNAL_URL || "http://raiser-content-intel:3015";
const API_KEY = process.env.CONTENT_INTEL_API_KEY || "";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const limit = searchParams.get("limit") || "100";

  const query = new URLSearchParams({ limit });
  if (search) query.set("search", search);

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${CONTENT_INTEL_URL}/api/creators?${query}`, {
      headers: { "X-API-Key": API_KEY },
      signal: controller.signal,
    });

    if (!res.ok) {
      return NextResponse.json({ creators: [], total: 0 }, { status: 200 });
    }

    const data = await res.json();
    // Normalize shape
    const creators = Array.isArray(data) ? data : (data.creators ?? data.items ?? []);
    return NextResponse.json({ creators, total: data.total ?? creators.length });
  } catch {
    return NextResponse.json({ creators: [], total: 0 });
  }
}
