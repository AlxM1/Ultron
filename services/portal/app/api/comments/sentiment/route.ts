import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  host: process.env.CONTENT_INTEL_DB_HOST || "raiser-postgres",
  database: "content_intel",
  user: process.env.CONTENT_INTEL_DB_USER || "postgres",
  password: process.env.CONTENT_INTEL_DB_PASSWORD || "",
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

    // === YouTube comments (existing) ===
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

    const { rows } = await pool.query(
      `SELECT c.text, c.published_at, c.likes, c.author, c.sentiment, cr.name as creator_name
       FROM comments c
       JOIN content co ON c.content_id = co.id
       JOIN creators cr ON co.creator_id = cr.id
       WHERE (c.text ILIKE '%' || $1 || '%'
              OR co.id IN (SELECT content_id FROM content_tags WHERE tag_type = 'guest' AND tag_value ILIKE $1))
         AND c.published_at BETWEEN $2 AND $3
       ORDER BY c.published_at DESC NULLS LAST, c.likes DESC NULLS LAST
       LIMIT 20`,
      [keyword, from, to]
    );

    // === Reddit posts ===
    const { rows: redditRows } = await pool.query(
      `SELECT id, title, body, author, subreddit, score as likes, num_comments, created_utc as published_at, permalink
       FROM reddit_posts
       WHERE (title ILIKE '%' || $1 || '%' OR body ILIKE '%' || $1 || '%'
              OR search_keyword ILIKE $1)
         AND created_utc BETWEEN $2 AND $3
       ORDER BY created_utc DESC NULLS LAST, score DESC NULLS LAST
       LIMIT 20`,
      [keyword, from, to]
    );

    // === X posts ===
    const { rows: xRows } = await pool.query(
      `SELECT id, text, author_handle, likes, retweets, created_at
       FROM x_posts
       WHERE (text ILIKE '%' || $1 || '%'
              OR search_keyword ILIKE $1
              OR author_handle ILIKE $1)
         AND created_at BETWEEN $2 AND $3
       ORDER BY created_at DESC NULLS LAST, likes DESC NULLS LAST
       LIMIT 20`,
      [keyword, from, to]
    );

    // === Reddit aggregation ===
    const { rows: redditAgg } = await pool.query(
      `SELECT count(*) as total, to_char(created_utc, 'YYYY-MM') as month
       FROM reddit_posts
       WHERE (title ILIKE '%' || $1 || '%' OR body ILIKE '%' || $1 || '%'
              OR search_keyword ILIKE $1)
         AND created_utc BETWEEN $2 AND $3
       GROUP BY to_char(created_utc, 'YYYY-MM')`,
      [keyword, from, to]
    );

    const { rows: xAgg } = await pool.query(
      `SELECT count(*) as total, to_char(created_at, 'YYYY-MM') as month
       FROM x_posts
       WHERE (text ILIKE '%' || $1 || '%'
              OR search_keyword ILIKE $1
              OR author_handle ILIKE $1)
         AND created_at BETWEEN $2 AND $3
       GROUP BY to_char(created_at, 'YYYY-MM')`,
      [keyword, from, to]
    );

    // Build aggregates from YouTube
    let posCount = 0, negCount = 0, neuCount = 0;
    const timeline: Record<string, { positive: number; negative: number; neutral: number }> = {};
    const creatorsMap: Record<string, { positive: number; negative: number; neutral: number }> = {};

    // Platform breakdown tracking
    const platformBreakdown: Record<string, { positive: number; negative: number; neutral: number; total: number }> = {
      youtube: { positive: 0, negative: 0, neutral: 0, total: 0 },
      reddit: { positive: 0, negative: 0, neutral: 0, total: 0 },
      x: { positive: 0, negative: 0, neutral: 0, total: 0 },
    };

    for (const row of aggRows) {
      const count = parseInt(row.total, 10);
      const s = row.sentiment || "neutral";
      const month = row.month;
      const creator = row.creator_name;

      if (s === "positive") { posCount += count; platformBreakdown.youtube.positive += count; }
      else if (s === "negative") { negCount += count; platformBreakdown.youtube.negative += count; }
      else { neuCount += count; platformBreakdown.youtube.neutral += count; }
      platformBreakdown.youtube.total += count;

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

    // Process Reddit posts for sentiment + aggregation
    for (const row of redditAgg) {
      const count = parseInt(row.total, 10);
      // We'll classify per-post below; for aggregate timeline just add to neutral placeholder
      // Actually let's do per-row classification for reddit
    }

    // Classify reddit posts individually and aggregate
    const allRedditForAgg = await pool.query(
      `SELECT title, body, created_utc
       FROM reddit_posts
       WHERE (title ILIKE '%' || $1 || '%' OR body ILIKE '%' || $1 || '%'
              OR search_keyword ILIKE $1)
         AND created_utc BETWEEN $2 AND $3`,
      [keyword, from, to]
    );
    for (const r of allRedditForAgg.rows) {
      const text = (r.title || "") + " " + (r.body || "");
      const s = classifySentiment(text);
      const month = r.created_utc ? new Date(r.created_utc).toISOString().slice(0, 7) : null;
      if (s === "positive") { posCount++; platformBreakdown.reddit.positive++; }
      else if (s === "negative") { negCount++; platformBreakdown.reddit.negative++; }
      else { neuCount++; platformBreakdown.reddit.neutral++; }
      platformBreakdown.reddit.total++;
      if (month) {
        if (!timeline[month]) timeline[month] = { positive: 0, negative: 0, neutral: 0 };
        timeline[month][s]++;
      }
    }

    // Classify X posts individually and aggregate
    const allXForAgg = await pool.query(
      `SELECT text, created_at
       FROM x_posts
       WHERE (text ILIKE '%' || $1 || '%'
              OR search_keyword ILIKE $1
              OR author_handle ILIKE $1)
         AND created_at BETWEEN $2 AND $3`,
      [keyword, from, to]
    );
    for (const r of allXForAgg.rows) {
      const s = classifySentiment(r.text || "");
      const month = r.created_at ? new Date(r.created_at).toISOString().slice(0, 7) : null;
      if (s === "positive") { posCount++; platformBreakdown.x.positive++; }
      else if (s === "negative") { negCount++; platformBreakdown.x.negative++; }
      else { neuCount++; platformBreakdown.x.neutral++; }
      platformBreakdown.x.total++;
      if (month) {
        if (!timeline[month]) timeline[month] = { positive: 0, negative: 0, neutral: 0 };
        timeline[month][s]++;
      }
    }

    const total = posCount + negCount + neuCount;
    const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;

    // Themes from top comments text (YouTube only for themes)
    const posThemes: Record<string, number> = {};
    const negThemes: Record<string, number> = {};
    const allTexts = [
      ...rows.map((r: any) => r.text),
      ...redditRows.map((r: any) => (r.title || "") + " " + (r.body || "")),
      ...xRows.map((r: any) => r.text),
    ];
    for (const text of allTexts) {
      for (const t of getThemes(text, POSITIVE)) posThemes[t] = (posThemes[t] || 0) + 1;
      for (const t of getThemes(text, NEGATIVE)) negThemes[t] = (negThemes[t] || 0) + 1;
    }
    const topByTheme = (themes: Record<string, number>) =>
      Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);

    // Build top comments with platform field
    const topComments = [
      ...rows.map((c: any) => ({
        text: c.text.slice(0, 300),
        sentiment: c.sentiment || classifySentiment(c.text),
        likes: c.likes || 0,
        date: c.published_at ? new Date(c.published_at).toISOString().split("T")[0] : "",
        creator: c.creator_name,
        author: c.author,
        platform: "youtube" as const,
      })),
      ...redditRows.map((r: any) => {
        const text = (r.title || "") + " " + (r.body || "");
        return {
          text: text.slice(0, 300),
          sentiment: classifySentiment(text),
          likes: r.likes || 0,
          date: r.published_at ? new Date(r.published_at).toISOString().split("T")[0] : "",
          creator: r.subreddit ? `r/${r.subreddit}` : "",
          author: r.author || "",
          platform: "reddit" as const,
        };
      }),
      ...xRows.map((r: any) => ({
        text: (r.text || "").slice(0, 300),
        sentiment: classifySentiment(r.text || ""),
        likes: r.likes || 0,
        date: r.created_at ? new Date(r.created_at).toISOString().split("T")[0] : "",
        creator: "",
        author: r.author_handle || "",
        platform: "x" as const,
      })),
    ].sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.likes - a.likes).slice(0, 30);

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
      platform_breakdown: platformBreakdown,
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
