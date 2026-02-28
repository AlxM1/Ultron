import { NextResponse } from "next/server";
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

async function safeCount(table: string): Promise<number> {
  try {
    const r = await pool.query(`SELECT count(*)::int AS c FROM ${table}`);
    return r.rows[0]?.c ?? 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  try {
    const [videos, transcripts, comments, redditPosts, xPosts, substackPosts, content] =
      await Promise.all([
        safeCount("content"),
        safeCount("transcripts"),
        safeCount("comments"),
        safeCount("reddit_posts"),
        safeCount("x_posts"),
        safeCount("substack_posts"),
        safeCount("content"),
      ]);

    return NextResponse.json({
      stats: {
        videos,
        transcripts,
        comments,
        redditPosts,
        xPosts,
        substackPosts,
        content,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message, stats: null },
      { status: 500 }
    );
  }
}
