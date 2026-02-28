import { NextRequest, NextResponse } from "next/server";
import { pool, STOP_WORDS, classifySentiment } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Extract keywords from all platforms in last 7 days and last 14 days (for change calc)
    const keywordQuery = `
      WITH all_texts AS (
        SELECT text, published_at FROM comments WHERE published_at > NOW() - INTERVAL '14 days'
        UNION ALL
        SELECT (title || ' ' || COALESCE(body, '')) as text, created_utc as published_at FROM reddit_posts WHERE created_utc > NOW() - INTERVAL '14 days'
        UNION ALL
        SELECT text, created_at as published_at FROM x_posts WHERE created_at > NOW() - INTERVAL '14 days'
      ),
      words AS (
        SELECT
          lower(word) as word,
          published_at
        FROM all_texts,
        LATERAL regexp_split_to_table(regexp_replace(text, '[^a-zA-Z\\s]', ' ', 'g'), '\\s+') AS word
        WHERE length(word) > 2
      ),
      recent AS (
        SELECT word, count(*) as cnt
        FROM words WHERE published_at > NOW() - INTERVAL '7 days'
        GROUP BY word HAVING count(*) >= 3
      ),
      prev AS (
        SELECT word, count(*) as cnt
        FROM words WHERE published_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
        GROUP BY word
      )
      SELECT r.word, r.cnt as count, COALESCE(p.cnt, 0) as prev_count
      FROM recent r
      LEFT JOIN prev p ON r.word = p.word
      ORDER BY r.cnt DESC
      LIMIT 200
    `;

    const { rows } = await pool.query(keywordQuery);

    const trendingWords = rows
      .filter(r => !STOP_WORDS.has(r.word))
      .slice(0, 30)
      .map(r => {
        const count = parseInt(r.count, 10);
        const prev = parseInt(r.prev_count, 10);
        const change = prev > 0 ? Math.round(((count - prev) / prev) * 100) : 100;
        return {
          keyword: r.word,
          count,
          sentiment: classifySentiment(r.word),
          change,
        };
      });

    // Fetch most recent comments for each trending keyword
    const trending = await Promise.all(
      trendingWords.map(async (tw) => {
        const { rows: recentComments } = await pool.query(
          `(SELECT text, published_at as date, 'youtube' as platform FROM comments
            WHERE text ILIKE '%' || $1 || '%' AND published_at > NOW() - INTERVAL '7 days'
            ORDER BY published_at DESC NULLS LAST LIMIT 2)
           UNION ALL
           (SELECT (title || ' ' || COALESCE(body, '')) as text, created_utc as date, 'reddit' as platform FROM reddit_posts
            WHERE (title ILIKE '%' || $1 || '%' OR body ILIKE '%' || $1 || '%') AND created_utc > NOW() - INTERVAL '7 days'
            ORDER BY created_utc DESC NULLS LAST LIMIT 2)
           UNION ALL
           (SELECT text, created_at as date, 'x' as platform FROM x_posts
            WHERE text ILIKE '%' || $1 || '%' AND created_at > NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC NULLS LAST LIMIT 2)`,
          [tw.keyword]
        );
        return {
          ...tw,
          recent_comments: recentComments.map((c: any) => ({
            text: (c.text || "").slice(0, 200),
            date: c.date ? new Date(c.date).toISOString().split("T")[0] : "",
            platform: c.platform,
          })),
        };
      })
    );

    return NextResponse.json({ trending });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Trending API error:", message);
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 });
  }
}
