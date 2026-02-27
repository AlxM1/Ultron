import { NextRequest, NextResponse } from "next/server";

const OUTLINE_BASE = process.env.OUTLINE_INTERNAL_URL || "http://raiser-outline:3000";
const OUTLINE_API_KEY = process.env.OUTLINE_API_KEY || "";

export const dynamic = "force-dynamic";

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
  const query = request.nextUrl.searchParams.get("q") || request.nextUrl.searchParams.get("search") || "";
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "25", 10);

  try {
    if (query) {
      const searchRes = await outlinePost("documents.search", { query, limit });
      const results = (searchRes?.data ?? []).map((item: any) => ({
        id: item.document?.id,
        title: item.document?.title,
        collection: item.document?.collection?.name,
        updatedAt: item.document?.updatedAt,
        url: item.document?.url,
        context: item.context,
        ranking: item.ranking,
      }));
      return NextResponse.json({ results, total: searchRes?.pagination?.total ?? results.length });
    }

    // No query — return recent documents
    const docsRes = await outlinePost("documents.list", { limit, sort: "updatedAt", direction: "DESC" });
    const documents = (docsRes?.data ?? []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      collection: doc.collection?.name,
      updatedAt: doc.updatedAt,
      url: doc.url,
    }));
    return NextResponse.json({ results: documents, total: docsRes?.pagination?.total ?? documents.length });
  } catch (err) {
    return NextResponse.json(
      { results: [], total: 0, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 200 }
    );
  }
}
