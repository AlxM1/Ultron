import { NextResponse } from "next/server";
import { fetchContentIntel } from "../_lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [creators, stats] = await Promise.allSettled([
      fetchContentIntel("/api/creators?limit=1"),
      fetchContentIntel("/api/stats"),
    ]);

    const creatorsData = creators.status === "fulfilled" ? creators.value : null;
    
    // Try dedicated stats endpoint first, fall back to assembling from creators
    if (stats.status === "fulfilled") {
      return NextResponse.json(stats.value);
    }

    // Assemble stats from what we can get
    const result: Record<string, number> = {
      total_creators: creatorsData?.total || 0,
    };

    // Try to get transcript/video/comment counts
    try {
      const full = await fetchContentIntel("/api/creators?limit=999");
      const allCreators = full.creators || [];
      result.total_creators = full.total || allCreators.length;
      result.total_content = allCreators.reduce((s: number, c: any) => s + (parseInt(c.content_count) || 0), 0);
    } catch {}

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 502 });
  }
}
