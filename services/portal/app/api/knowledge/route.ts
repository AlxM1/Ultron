import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OUTLINE_BASE = process.env.OUTLINE_INTERNAL_URL || "http://raiser-outline:3000";
const OUTLINE_API_KEY = process.env.OUTLINE_API_KEY || "";

async function outlinePost(path: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${OUTLINE_BASE}/api/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OUTLINE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Outline ${path}: ${res.status}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || searchParams.get("search") || "";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  try {
    if (query) {
      const data = await outlinePost("documents.search", { query, limit });
      const results = (data?.data ?? []).map((item: any) => ({
        id: item.document?.id,
        title: item.document?.title,
        context: item.context,
        collectionId: item.document?.collectionId,
        updatedAt: item.document?.updatedAt,
        url: item.document?.url,
      }));
      return NextResponse.json({ results, total: results.length });
    }

    // No query — return recent docs
    const data = await outlinePost("documents.list", { limit, sort: "updatedAt", direction: "DESC" });
    const documents = (data?.data ?? []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      collectionId: doc.collectionId,
      updatedAt: doc.updatedAt,
      url: doc.url,
    }));
    return NextResponse.json({ results: documents, total: documents.length });
  } catch (err) {
    return NextResponse.json(
      { results: [], total: 0, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 200 }
    );
  }
}
