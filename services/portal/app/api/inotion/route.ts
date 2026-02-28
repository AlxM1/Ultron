import { NextResponse } from "next/server";

const OUTLINE_BASE =
  process.env.OUTLINE_INTERNAL_URL || "http://raiser-outline:3000";
const OUTLINE_API_KEY =
  process.env.OUTLINE_API_KEY || "ol_api_947cc499f25ffd2e51649c5a610ba524cd60b8";

async function outlinePost(path: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${OUTLINE_BASE}/api/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OUTLINE_API_KEY}`,
    },
    body: JSON.stringify(body),
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`Outline API ${path} returned ${res.status}`);
  }
  return res.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  try {
    // Parallel requests to Outline
    const [collectionsRes, docsRes] = await Promise.all([
      outlinePost("collections.list", {}),
      outlinePost("documents.list", {
        limit: 10,
        sort: "updatedAt",
        direction: "DESC",
      }),
    ]);

    const collections: OutlineCollection[] = collectionsRes?.data ?? [];
    const recentDocs: OutlineDocument[] = docsRes?.data ?? [];

    // Optional search
    let searchResults: OutlineDocument[] = [];
    if (search) {
      const searchRes = await outlinePost("documents.search", { query: search });
      searchResults = (searchRes?.data ?? []).map(
        (item: { document: OutlineDocument }) => item.document
      );
    }

    // Aggregate metrics — use pagination total from documents.list since
    // Outline's collections.list doesn't always include documentCount
    const totalDocuments =
      docsRes?.pagination?.total ??
      collections.reduce(
        (sum: number, c: OutlineCollection) => sum + (c.documentCount ?? 0),
        0
      );

    const lastUpdatedDoc = recentDocs[0];
    const lastUpdated = lastUpdatedDoc?.updatedAt ?? null;

    return NextResponse.json({
      ok: true,
      metrics: {
        totalDocuments,
        totalCollections: collections.length,
        lastUpdated,
        systemStatus: "ACTIVE",
      },
      collections,
      recentDocuments: recentDocs,
      searchResults,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        metrics: {
          totalDocuments: 0,
          totalCollections: 0,
          lastUpdated: null,
          systemStatus: "FAILED",
        },
        collections: [],
        recentDocuments: [],
        searchResults: [],
      },
      { status: 200 } // Return 200 so the page can show degraded state
    );
  }
}

// Types
interface OutlineCollection {
  id: string;
  name: string;
  description?: string;
  documentCount?: number;
  color?: string;
  updatedAt?: string;
  createdAt?: string;
  sort?: { field: string; direction: string };
  icon?: string;
}

interface OutlineDocument {
  id: string;
  title: string;
  text?: string;
  collectionId?: string;
  collection?: { name: string };
  updatedAt?: string;
  createdAt?: string;
  createdBy?: { name: string };
  updatedBy?: { name: string };
  url?: string;
  publishedAt?: string;
  archivedAt?: string | null;
  template?: boolean;
  parentDocumentId?: string | null;
}
