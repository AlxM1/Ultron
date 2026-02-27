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

      // 5. Top words from transcripts (simple word frequency)
      const topWords = await client.query(`
        WITH words AS (
          SELECT lower(regexp_split_to_table(
            regexp_replace(t.text, '[^a-zA-Z\\s]', ' ', 'g'),
            '\\s+'
          )) as word
          FROM transcripts t
          LIMIT 500000
        )
        SELECT word, COUNT(*)::int as freq
        FROM words
        WHERE length(word) > 4
          AND word NOT IN ('about','would','their','there','could','should','which',
            'those','these','being','other','after','before','every','still','where',
            'going','really','think','things','people','right','actually','something',
            'because','gonna','thing','thats','youre','theyre','dont','theres','doing',
            'getting','looking','making','trying','using','maybe','never','first',
            'years','always','might','money','great','start','video','watch','today',
            'literally','essentially','different','through','between','another','little',
            'everything','everyone','someone','anything','nothing','having','coming',
            'taking','working','saying','talking','called','pretty','whole','point',
            'based','level','exactly','around','again','since','while','under','learn',
            'times','place','found','order','three','world','still','super','stuff',
            'knows','whats','wants','needs','means','comes','takes','makes','gives',
            'looks','feels','keeps','seems','shows','helps','wants','happen','became',
            'check','links','below','subscribe','channel','click','button')
        GROUP BY word
        ORDER BY freq DESC
        LIMIT 50
      `);

      // 6. Cross-creator topic overlap (top words per creator, find shared ones)
      const creatorTopics = await client.query(`
        WITH creator_words AS (
          SELECT cr.name as creator,
                 lower(regexp_split_to_table(
                   regexp_replace(t.text, '[^a-zA-Z\\s]', ' ', 'g'),
                   '\\s+'
                 )) as word
          FROM transcripts t
          JOIN content co ON t.content_id = co.id
          JOIN creators cr ON co.creator_id = cr.id
        ),
        creator_word_counts AS (
          SELECT creator, word, COUNT(*)::int as freq
          FROM creator_words
          WHERE length(word) > 4
            AND word NOT IN ('about','would','their','there','could','should','which',
              'those','these','being','other','after','before','every','still','where',
              'going','really','think','things','people','right','actually','something',
              'because','gonna','thing','thats','youre','theyre','dont','theres','doing',
              'getting','looking','making','trying','using','maybe','never','first',
              'years','always','might','money','great','start','video','watch','today',
              'literally','essentially','different','through','between','another','little',
              'everything','everyone','someone','anything','nothing','having','coming',
              'taking','working','saying','talking','called','pretty','whole','point',
              'based','level','exactly','around','again','since','while','under','learn',
              'times','place','found','order','three','world','still','super','stuff',
              'knows','whats','wants','needs','means','comes','takes','makes','gives',
              'looks','feels','keeps','seems','shows','helps','wants','happen','became',
              'check','links','below','subscribe','channel','click','button')
          GROUP BY creator, word
          HAVING COUNT(*) >= 10
        ),
        top_per_creator AS (
          SELECT creator, word, freq,
                 ROW_NUMBER() OVER (PARTITION BY creator ORDER BY freq DESC) as rn
          FROM creator_word_counts
        )
        SELECT word, array_agg(DISTINCT creator ORDER BY creator) as creators,
               COUNT(DISTINCT creator)::int as creator_count,
               SUM(freq)::int as total_freq
        FROM top_per_creator
        WHERE rn <= 30
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
