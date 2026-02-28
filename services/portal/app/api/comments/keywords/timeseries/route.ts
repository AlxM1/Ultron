import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../_shared";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keywordsParam = searchParams.get("keywords");
    const days = parseInt(searchParams.get("days") || "90", 10);
    const interval = searchParams.get("interval") || "week";

    if (!keywordsParam) {
      return NextResponse.json({ error: "keywords parameter is required" }, { status: 400 });
    }

    const keywords = keywordsParam.split(",").map(k => k.trim().toLowerCase());
    const intervalExpr = interval === "day" ? "day" : interval === "month" ? "month" : "week";

    const series = await Promise.all(keywords.map(async (kw) => {
      const { rows } = await pool.query(`
        WITH all_texts AS (
          SELECT text, published_at FROM comments WHERE published_at > NOW() - INTERVAL '${days} days'
          UNION ALL
          SELECT (title || ' ' || COALESCE(body, '')) as text, created_utc FROM reddit_posts WHERE created_utc > NOW() - INTERVAL '${days} days'
          UNION ALL
          SELECT text, created_at FROM x_posts WHERE created_at > NOW() - INTERVAL '${days} days'
        )
        SELECT date_trunc($2, published_at)::date as date, count(*) as count
        FROM all_texts
        WHERE lower(text) LIKE '%' || $1 || '%'
        GROUP BY date_trunc($2, published_at)::date
        ORDER BY date
      `, [kw, intervalExpr]);

      return {
        keyword: kw,
        data: rows.map(r => ({ date: r.date.toISOString().split("T")[0], count: parseInt(r.count, 10) })),
      };
    }));

    return NextResponse.json({ series });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Timeseries API error:", message);
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 });
  }
}
