import { NextResponse } from "next/server";
import { fetchContentIntel } from "../_lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Query content-intel individual endpoints for counts
    const [creatorsRes, contentRes, transcriptsRes] = await Promise.allSettled([
      fetchContentIntel("/api/creators?limit=1"),
      fetchContentIntel("/api/content?limit=1"),
      fetchContentIntel("/api/transcripts?limit=1"),
    ]);

    const totalCreators =
      creatorsRes.status === "fulfilled"
        ? creatorsRes.value?.total ?? 0
        : 0;
    const totalContent =
      contentRes.status === "fulfilled"
        ? contentRes.value?.total ?? 0
        : 0;
    const totalTranscripts =
      transcriptsRes.status === "fulfilled"
        ? transcriptsRes.value?.total ?? 0
        : 0;

    return NextResponse.json({
      totalCreators,
      totalContent,
      totalTranscripts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch stats", totalCreators: 0, totalContent: 0, totalTranscripts: 0 },
      { status: 502 }
    );
  }
}
