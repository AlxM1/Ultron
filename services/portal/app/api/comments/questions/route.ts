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

const QUESTION_PATTERNS = [
  "how do", "how can", "how to", "what is", "what are", "what does",
  "why do", "why is", "why does", "where can", "when do", "which",
  "can you", "could you", "should i", "is there", "are there",
  "does anyone", "has anyone", "any tips", "any advice", "any suggestions",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creator = searchParams.get("creator") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500);

    let query = `
      SELECT c.text, c.likes, c.published_at, cr.name as creator_name
      FROM comments c
      JOIN content co ON c.content_id = co.id
      JOIN creators cr ON co.creator_id = cr.id
      WHERE c.text ~* '\\?'
        AND length(c.text) > 30
    `;
    const params: string[] = [];
    if (creator) {
      params.push(creator);
      query += ` AND cr.name ILIKE '%' || $${params.length} || '%'`;
    }
    query += ` ORDER BY c.published_at DESC NULLS LAST, c.likes DESC NULLS LAST LIMIT ${limit}`;

    const { rows } = await pool.query(query, params);

    // Group questions by theme using simple keyword clustering
    const themes: Record<string, { count: number; samples: string[]; creators: Set<string> }> = {};

    for (const row of rows) {
      const text = (row.text || "").toLowerCase();
      let matched = false;
      for (const pattern of QUESTION_PATTERNS) {
        if (text.includes(pattern)) {
          if (!themes[pattern]) themes[pattern] = { count: 0, samples: [], creators: new Set() };
          themes[pattern].count++;
          if (themes[pattern].samples.length < 3) {
            themes[pattern].samples.push(row.text.slice(0, 200));
          }
          themes[pattern].creators.add(row.creator_name);
          matched = true;
          break;
        }
      }
      if (!matched) {
        if (!themes["other"]) themes["other"] = { count: 0, samples: [], creators: new Set() };
        themes["other"].count++;
        if (themes["other"].samples.length < 3) {
          themes["other"].samples.push(row.text.slice(0, 200));
        }
        themes["other"].creators.add(row.creator_name);
      }
    }

    const questions = Object.entries(themes)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([theme, data]) => ({
        theme,
        count: data.count,
        samples: data.samples,
        creators: Array.from(data.creators).slice(0, 10),
      }));

    return NextResponse.json({ questions, total: rows.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Comments questions API error:", message);
    return NextResponse.json({ error: message, questions: [] }, { status: 500 });
  }
}
