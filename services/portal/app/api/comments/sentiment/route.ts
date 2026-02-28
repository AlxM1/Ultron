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
    const limit = Math.min(parseInt(searchParams.get("limit") || "500", 10), 5000);

    if (!keyword) {
      return NextResponse.json({ error: "keyword parameter is required" }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT c.text, c.published_at, c.likes, c.author, cr.name as creator_name
       FROM comments c
       JOIN content co ON c.content_id = co.id
       JOIN creators cr ON co.creator_id = cr.id
       WHERE c.text ILIKE '%' || $1 || '%'
         AND c.published_at BETWEEN $2 AND $3
       ORDER BY c.published_at DESC
       LIMIT $4`,
      [keyword, from, to, limit]
    );

    let posCount = 0, negCount = 0, neuCount = 0;
    const posThemes: Record<string, number> = {};
    const negThemes: Record<string, number> = {};
    const timeline: Record<string, { positive: number; negative: number; neutral: number }> = {};
    const creatorsMap: Record<string, { positive: number; negative: number; neutral: number }> = {};

    interface CommentRow {
      text: string;
      published_at: string | Date;
      likes: number;
      author: string;
      creator_name: string;
    }

    const classified = rows.map((row: CommentRow) => {
      const sentiment = classifySentiment(row.text);
      const date = new Date(row.published_at);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (sentiment === "positive") {
        posCount++;
        for (const t of getThemes(row.text, POSITIVE)) posThemes[t] = (posThemes[t] || 0) + 1;
      } else if (sentiment === "negative") {
        negCount++;
        for (const t of getThemes(row.text, NEGATIVE)) negThemes[t] = (negThemes[t] || 0) + 1;
      } else {
        neuCount++;
      }

      if (!timeline[month]) timeline[month] = { positive: 0, negative: 0, neutral: 0 };
      timeline[month][sentiment]++;

      const cn = row.creator_name;
      if (!creatorsMap[cn]) creatorsMap[cn] = { positive: 0, negative: 0, neutral: 0 };
      creatorsMap[cn][sentiment]++;

      return { ...row, sentiment, date: date.toISOString().split("T")[0] };
    });

    const total = rows.length;
    const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;

    const topByTheme = (themes: Record<string, number>) =>
      Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);

    const topComments = classified
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 10)
      .map(c => ({
        text: c.text.slice(0, 300),
        sentiment: c.sentiment,
        likes: c.likes || 0,
        date: c.date,
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
