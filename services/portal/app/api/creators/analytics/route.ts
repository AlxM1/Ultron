import { NextResponse } from "next/server";
import pool from "../../../lib/contentIntelDb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      // 1. Content per creator
      const contentPerCreator = await client.query(`
        SELECT cr.name, cr.platform, COUNT(co.id)::int as count,
               cr.subscriber_count
        FROM creators cr
        LEFT JOIN content co ON cr.id = co.creator_id
        GROUP BY cr.id, cr.name, cr.platform, cr.subscriber_count
        ORDER BY count DESC
      `);

      // 2. Content over time (monthly)
      const contentOverTime = await client.query(`
        SELECT cr.name,
               to_char(co.published_at, 'YYYY-MM') as month,
               COUNT(*)::int as count
        FROM content co
        JOIN creators cr ON co.creator_id = cr.id
        WHERE co.published_at IS NOT NULL
        GROUP BY cr.name, month
        ORDER BY month
      `);

      // 3. Engagement metrics aggregated per creator
      const engagement = await client.query(`
        SELECT cr.name,
               COUNT(co.id)::int as total_content,
               COALESCE(SUM((co.metrics->>'view_count')::bigint), 0)::bigint as total_views,
               COALESCE(SUM((co.metrics->>'like_count')::bigint), 0)::bigint as total_likes,
               COALESCE(SUM((co.metrics->>'comment_count')::bigint), 0)::bigint as total_comments
        FROM creators cr
        LEFT JOIN content co ON cr.id = co.creator_id
          AND co.metrics ? 'view_count'
        GROUP BY cr.id, cr.name
        HAVING COALESCE(SUM((co.metrics->>'view_count')::bigint), 0) > 0
        ORDER BY total_views DESC
      `);

      // 4. Content velocity (posts per week, last 12 weeks)
      const velocity = await client.query(`
        SELECT cr.name,
               date_trunc('week', co.published_at)::date as week,
               COUNT(*)::int as count
        FROM content co
        JOIN creators cr ON co.creator_id = cr.id
        WHERE co.published_at >= NOW() - INTERVAL '12 weeks'
          AND co.published_at IS NOT NULL
        GROUP BY cr.name, week
        ORDER BY week
      `);

      // 5. Top topics from persona profiles (fast, pre-computed)
      const topWords = await client.query(`
        SELECT topic->>'topic' as word, (topic->>'count')::int as freq
        FROM personas, jsonb_array_elements(profile_json->'top_topics') as topic
        ORDER BY (topic->>'count')::int DESC
        LIMIT 50
      `);

      // 6. Cross-creator topic overlap from persona profiles (fast, pre-computed)
      const creatorTopics = await client.query(`
        WITH creator_topics AS (
          SELECT p.creator_name as creator,
                 topic->>'topic' as word,
                 (topic->>'count')::int as freq
          FROM personas p, jsonb_array_elements(p.profile_json->'top_topics') as topic
        )
        SELECT word, array_agg(DISTINCT creator ORDER BY creator) as creators,
               COUNT(DISTINCT creator)::int as creator_count,
               SUM(freq)::int as total_freq
        FROM creator_topics
        GROUP BY word
        HAVING COUNT(DISTINCT creator) >= 2
        ORDER BY creator_count DESC, total_freq DESC
        LIMIT 30
      `);

      // 7. Summary stats
      const summary = await client.query(`
        SELECT
          (SELECT COUNT(*)::int FROM creators) as total_creators,
          (SELECT COUNT(*)::int FROM content) as total_content,
          (SELECT COUNT(*)::int FROM transcripts) as total_transcripts,
          (SELECT COUNT(*)::int FROM comments) as total_comments
      `);

      return NextResponse.json({
        summary: summary.rows[0],
        contentPerCreator: contentPerCreator.rows,
        contentOverTime: contentOverTime.rows,
        engagement: engagement.rows,
        velocity: velocity.rows,
        topWords: topWords.rows,
        creatorTopicOverlap: creatorTopics.rows,
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.error("Analytics query error:", err);
    return NextResponse.json(
      { error: "Failed to query analytics", detail: String(err) },
      { status: 500 }
    );
  }
}
