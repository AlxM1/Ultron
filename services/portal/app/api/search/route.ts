import { NextRequest, NextResponse } from "next/server";

const OUTLINE_URL = process.env.OUTLINE_INTERNAL_URL || "http://raiser-outline:3000";
const OUTLINE_KEY = process.env.OUTLINE_API_KEY || "ol_api_947cc499f25ffd2e51649c5a610ba524cd60b8";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${OUTLINE_URL}/api/documents.search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OUTLINE_KEY}`,
      },
      body: JSON.stringify({ query: q, limit }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return NextResponse.json({ results: [], error: `Outline error: ${res.status}` });
    }

    const data = await res.json();
    const results = (data.data || []).map((item: any) => ({
      id: item.document?.id ?? item.id,
      title: item.document?.title ?? item.title ?? "Untitled",
      snippet: item.context ?? item.document?.text?.substring(0, 200) ?? "",
      collection: item.document?.collectionId ?? "",
      collectionName: item.document?.collection?.name ?? "",
      url: item.document?.url ?? null,
      updatedAt: item.document?.updatedAt ?? null,
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "Search unavailable" });
  }
}
