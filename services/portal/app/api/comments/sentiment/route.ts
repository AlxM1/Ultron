import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  host: process.env.DB_HOST || "raiser-postgres",
  database: "content_intel",
  user: "content_intel",
  password: "content_intel",
  port: 5432,
  max: 3,
});

const POSITIVE = ["love","amazing","great","awesome","excellent","brilliant","best","incredible","fantastic","thank","helpful","insightful","genius","powerful","groundbreaking","revolutionary"];
const NEGATIVE = ["hate","terrible","worst","awful","garbage","trash","scam","useless","stupid","horrible","disappointed","overrated","waste","boring","misleading"];

function classifySentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const posCount = POSITIVE.filter(w => lower.includes(w)).length;
  const negCount = NEGATIVE.filter(w => lower.includes(w)).length;
  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  if (posCount > 0 && posCount === negCount) return "neutral";
  return "neutral";
}

function getThemes(text: string, list: string[]): string[] {
  const lower = text.toLowerCase();
  return list.filter(w => lower.includes(w));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword");
    const from = searchParams.get("from") || "2020-01-01";
    const to = searchParams.get("to") || "2099-12-31";
    if (!keyword) {
      return NextResponse.json({ error: "keyword parameter is required" }, { status: 400 });
    }

    // Aggregated counts across ALL matching rows (no limit)
    // Includes both keyword matches in comment text AND comments from videos
    // where the keyword matches a guest tag (board member appearances)
    const { rows: aggRows } = await pool.query(
      `SELECT 
         count(*) as total,
         cr.name as creator_name,
         c.sentiment,
         to_char(c.published_at, 'YYYY-MM') as month
       FROM comments c
       JOIN content co ON c.content_id = co.id
       JOIN creators cr ON co.creator_id = cr.id
       WHERE (c.text ILIKE '%' || $1 || '%'
              OR co.id IN (SELECT content_id FROM content_tags WHERE tag_type = 'guest' AND tag_value ILIKE $1))
         AND c.published_at BETWEEN $2 AND $3
       GROUP BY cr.name, c.sentiment, to_char(c.published_at, 'YYYY-MM')`,
      [keyword, from, to]
    );

    // Top comments by likes (limited) - same expanded search
    const { rows } = await pool.query(
      `SELECT c.text, c.published_at, c.likes, c.author, c.sentiment, cr.name as creator_name
       FROM comments c
       JOIN content co ON c.content_id = co.id
       JOIN creators cr ON co.creator_id = cr.id
       WHERE (c.text ILIKE '%' || $1 || '%'
              OR co.id IN (SELECT content_id FROM content_tags WHERE tag_type = 'guest' AND tag_value ILIKE $1))
         AND c.published_at BETWEEN $2 AND $3
       ORDER BY c.likes DESC NULLS LAST
       LIMIT 20`,
      [keyword, from, to]
    );

    // Build aggregates from pre-grouped DB results (covers ALL matching rows)
    let posCount = 0, negCount = 0, neuCount = 0;
    const timeline: Record<string, { positive: number; negative: number; neutral: number }> = {};
    const creatorsMap: Record<string, { positive: number; negative: number; neutral: number }> = {};

    for (const row of aggRows) {
      const count = parseInt(row.total, 10);
      const s = row.sentiment || "neutral";
      const month = row.month;
      const creator = row.creator_name;

      if (s === "positive") posCount += count;
      else if (s === "negative") negCount += count;
      else neuCount += count;

      if (month) {
        if (!timeline[month]) timeline[month] = { positive: 0, negative: 0, neutral: 0 };
        if (s === "positive") timeline[month].positive += count;
        else if (s === "negative") timeline[month].negative += count;
        else timeline[month].neutral += count;
      }

      if (creator) {
        if (!creatorsMap[creator]) creatorsMap[creator] = { positive: 0, negative: 0, neutral: 0 };
        if (s === "positive") creatorsMap[creator].positive += count;
        else if (s === "negative") creatorsMap[creator].negative += count;
        else creatorsMap[creator].neutral += count;
      }
    }

    const total = posCount + negCount + neuCount;
    const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;

    // Themes from top comments text
    const posThemes: Record<string, number> = {};
    const negThemes: Record<string, number> = {};
    for (const row of rows) {
      for (const t of getThemes(row.text, POSITIVE)) posThemes[t] = (posThemes[t] || 0) + 1;
      for (const t of getThemes(row.text, NEGATIVE)) negThemes[t] = (negThemes[t] || 0) + 1;
    }
    const topByTheme = (themes: Record<string, number>) =>
      Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);

    const topComments = rows.map((c: any) => ({
      text: c.text.slice(0, 300),
      sentiment: c.sentiment || classifySentiment(c.text),
      likes: c.likes || 0,
      date: c.published_at ? new Date(c.published_at).toISOString().split("T")[0] : "",
      creator: c.creator_name,
      author: c.author,
    }));

    const timelineSorted = Object.entries(timeline)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => ({ month, ...counts }));

    const creatorsBreakdown = Object.entries(creatorsMap)
      .sort((a, b) => {
        const totalA = a[1].positive + a[1].negative + a[1].neutral;
        const totalB = b[1].positive + b[1].negative + b[1].neutral;
        return totalB - totalA;
      })
      .slice(0, 20)
      .map(([creator, counts]) => ({ creator, ...counts }));

    return NextResponse.json({
      keyword,
      total_matches: total,
      date_range: { from, to },
      sentiment: {
        positive: { count: posCount, percentage: pct(posCount), top_themes: topByTheme(posThemes) },
        negative: { count: negCount, percentage: pct(negCount), top_themes: topByTheme(negThemes) },
        neutral: { count: neuCount, percentage: pct(neuCount) },
      },
      timeline: timelineSorted,
      top_comments: topComments,
      creators_breakdown: creatorsBreakdown,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Sentiment API error:", message);
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 });
  }
}
