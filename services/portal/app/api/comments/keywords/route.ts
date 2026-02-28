import { NextRequest, NextResponse } from "next/server";
import { pool, STOP_WORDS, classifySentiment } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const timeseries = searchParams.get("timeseries") === "true";
    const keywordsParam = searchParams.get("keywords");
    const interval = searchParams.get("interval") || "week";

    // If timeseries mode, redirect logic to timeseries
    if (timeseries && keywordsParam) {
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
    }

    // Standard keyword frequency mode
    const { rows } = await pool.query(`
      WITH all_texts AS (
        SELECT text FROM comments WHERE published_at > NOW() - INTERVAL '${days} days'
        UNION ALL
        SELECT (title || ' ' || COALESCE(body, '')) as text FROM reddit_posts WHERE created_utc > NOW() - INTERVAL '${days} days'
        UNION ALL
        SELECT text FROM x_posts WHERE created_at > NOW() - INTERVAL '${days} days'
      ),
      words AS (
        SELECT lower(word) as word
        FROM all_texts,
        LATERAL regexp_split_to_table(regexp_replace(text, '[^a-zA-Z\\s]', ' ', 'g'), '\\s+') AS word
        WHERE length(word) > 2
      )
      SELECT word, count(*) as freq
      FROM words
      GROUP BY word HAVING count(*) >= 2
      ORDER BY freq DESC
      LIMIT ${limit + 150}
    `);

    const keywords = rows
      .filter(r => !STOP_WORDS.has(r.word))
      .slice(0, limit)
      .map(r => ({
        word: r.word,
        freq: parseInt(r.freq, 10),
        sentiment: classifySentiment(r.word),
      }));

    return NextResponse.json({ keywords });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Keywords API error:", message);
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 });
  }
}
