import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../_shared";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keywordsParam = searchParams.get("keywords");
    const days = parseInt(searchParams.get("days") || "90", 10);

    if (!keywordsParam) {
      return NextResponse.json({ error: "keywords parameter is required" }, { status: 400 });
    }

    const keywords = keywordsParam.split(",").map(k => k.trim().toLowerCase());

    const heatmap = await Promise.all(keywords.map(async (kw) => {
      // YouTube comments - get creator breakdown
      const { rows: ytRows } = await pool.query(`
        SELECT cr.name, count(*) as count
        FROM comments c
        JOIN content co ON c.content_id = co.id
        JOIN creators cr ON co.creator_id = cr.id
        WHERE lower(c.text) LIKE '%' || $1 || '%'
          AND c.published_at > NOW() - INTERVAL '${days} days'
        GROUP BY cr.name
        ORDER BY count DESC
        LIMIT 20
      `, [kw]);

      // Reddit - subreddit as "creator"
      const { rows: redditRows } = await pool.query(`
        SELECT 'r/' || subreddit as name, count(*) as count
        FROM reddit_posts
        WHERE (lower(title) LIKE '%' || $1 || '%' OR lower(body) LIKE '%' || $1 || '%')
          AND created_utc > NOW() - INTERVAL '${days} days'
        GROUP BY subreddit
        ORDER BY count DESC
        LIMIT 10
      `, [kw]);

      const creators = [
        ...ytRows.map(r => ({ name: r.name, count: parseInt(r.count, 10) })),
        ...redditRows.map(r => ({ name: r.name, count: parseInt(r.count, 10) })),
      ].sort((a, b) => b.count - a.count);

      return { keyword: kw, creators };
    }));

    return NextResponse.json({ heatmap });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Heatmap API error:", message);
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 });
  }
}
