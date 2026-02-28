import { NextRequest, NextResponse } from "next/server";
import { fetchContentIntel } from "../../_lib/api";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await fetchContentIntel(`/api/creators/${encodeURIComponent(id)}`);
    return NextResponse.json(data);
  } catch (err: any) {
    if (err.message?.includes("404")) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to fetch creator" }, { status: 502 });
  }
}
