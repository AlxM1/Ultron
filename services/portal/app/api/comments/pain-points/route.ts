import { NextRequest, NextResponse } from "next/server";
import { pool } from "../_shared";

export const dynamic = "force-dynamic";

const PAIN_PATTERNS = [
  "wish", "hate", "problem", "issue", "frustrat", "annoy", "disappoint",
  "doesn't work", "doesnt work", "don't work", "dont work", "broken",
  "why can't", "why cant", "why doesn't", "why doesnt", "why isn't", "why isnt",
  "bug", "crash", "fail", "error", "wrong", "bad", "terrible", "awful",
  "waste", "scam", "misleading", "clickbait", "clickbaity", "overhyped",
  "confus", "unclear", "hard to", "difficult to", "struggling", "can't figure",
  "please fix", "need to fix", "should fix", "needs improvement",
  "missing", "lack", "no way to", "impossible", "ridiculous",
];

const THEME_CATEGORIES: Record<string, string[]> = {
  "Quality Issues": ["doesn't work", "doesnt work", "broken", "bug", "crash", "fail", "error"],
  "Frustration": ["hate", "frustrat", "annoy", "disappoint", "ridiculous", "awful", "terrible"],
  "Feature Requests": ["wish", "need", "missing", "lack", "no way to", "please"],
  "Confusion": ["confus", "unclear", "hard to", "difficult to", "struggling", "can't figure"],
  "Trust Issues": ["scam", "misleading", "clickbait", "clickbaity", "overhyped", "fake", "waste"],
  "Questions": ["?"],
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Build WHERE clause for pain patterns
    const patternConditions = PAIN_PATTERNS.map((_, i) => `lower(text) LIKE '%' || $${i + 1} || '%'`).join(" OR ");

    const params = PAIN_PATTERNS;

    // YouTube comments
    const { rows: ytRows } = await pool.query(`
      SELECT c.text, c.author, c.published_at, cr.name as creator
      FROM comments c
      JOIN content co ON c.content_id = co.id
      JOIN creators cr ON co.creator_id = cr.id
      WHERE c.published_at > NOW() - INTERVAL '${days} days'
        AND (${patternConditions})
      ORDER BY c.published_at DESC
      LIMIT ${limit}
    `, params);

    // Reddit
    const redditPatternConds = PAIN_PATTERNS.map((_, i) => `lower(title || ' ' || COALESCE(body, '')) LIKE '%' || $${i + 1} || '%'`).join(" OR ");
    const { rows: redditRows } = await pool.query(`
      SELECT (title || ' ' || COALESCE(body, '')) as text, author, created_utc as published_at, 'r/' || subreddit as creator
      FROM reddit_posts
      WHERE created_utc > NOW() - INTERVAL '${days} days'
        AND (${redditPatternConds})
      ORDER BY created_utc DESC
      LIMIT ${Math.floor(limit / 2)}
    `, params);

    // X posts
    const xPatternConds = PAIN_PATTERNS.map((_, i) => `lower(text) LIKE '%' || $${i + 1} || '%'`).join(" OR ");
    const { rows: xRows } = await pool.query(`
      SELECT text, author_handle as author, created_at as published_at, '' as creator
      FROM x_posts
      WHERE created_at > NOW() - INTERVAL '${days} days'
        AND (${xPatternConds})
      ORDER BY created_at DESC
      LIMIT ${Math.floor(limit / 2)}
    `, params);

    // Classify into categories
    const allPainPoints = [...ytRows, ...redditRows, ...xRows].map(r => {
      const lower = (r.text || "").toLowerCase();
      let category = "General";
      for (const [cat, patterns] of Object.entries(THEME_CATEGORIES)) {
        if (patterns.some(p => lower.includes(p))) {
          category = cat;
          break;
        }
      }
      return {
        text: (r.text || "").slice(0, 400),
        author: r.author || "",
        published_at: r.published_at ? new Date(r.published_at).toISOString() : "",
        creator: r.creator || "",
        category,
      };
    });

    // Count themes
    const themeCounts: Record<string, number> = {};
    for (const pp of allPainPoints) {
      themeCounts[pp.category] = (themeCounts[pp.category] || 0) + 1;
    }
    const themes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([theme, count]) => ({ theme, count }));

    return NextResponse.json({
      painPoints: allPainPoints.slice(0, limit),
      themes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Pain points API error:", message);
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 });
  }
}
