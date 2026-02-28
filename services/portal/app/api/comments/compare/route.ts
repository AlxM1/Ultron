import { NextRequest, NextResponse } from "next/server";
import { pool, classifySentiment } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorsParam = searchParams.get("creators");
    const topic = searchParams.get("topic");
    const days = parseInt(searchParams.get("days") || "90", 10);

    if (!creatorsParam) {
      return NextResponse.json({ error: "creators parameter is required (comma-separated IDs)" }, { status: 400 });
    }

    const creatorIds = creatorsParam.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    if (creatorIds.length === 0) {
      return NextResponse.json({ error: "No valid creator IDs provided" }, { status: 400 });
    }

    const topicFilter = topic ? `AND lower(c.text) LIKE '%' || $3 || '%'` : "";

    const comparison = await Promise.all(creatorIds.map(async (creatorId) => {
      const params: (string | number)[] = [creatorId, days];
      if (topic) params.push(topic.toLowerCase());

      // YouTube comments with sentiment from DB
      const { rows } = await pool.query(`
        SELECT c.text, c.sentiment, cr.name as creator_name
        FROM comments c
        JOIN content co ON c.content_id = co.id
        JOIN creators cr ON co.creator_id = cr.id
        WHERE cr.id = $1
          AND c.published_at > NOW() - INTERVAL '${days} days'
          ${topicFilter}
      `, params);

      let positive = 0, negative = 0, neutral = 0;
      let creatorName = "";

      for (const row of rows) {
        creatorName = row.creator_name;
        const s = row.sentiment || classifySentiment(row.text || "");
        if (s === "positive") positive++;
        else if (s === "negative") negative++;
        else neutral++;
      }

      // If no rows found, still get the creator name
      if (!creatorName) {
        const { rows: nameRows } = await pool.query("SELECT name FROM creators WHERE id = $1", [creatorId]);
        creatorName = nameRows[0]?.name || `Creator ${creatorId}`;
      }

      return {
        creator: creatorName,
        total: positive + negative + neutral,
        positive,
        negative,
        neutral,
      };
    }));

    return NextResponse.json({ comparison });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Compare API error:", message);
    return NextResponse.json({ error: "Internal server error", details: message }, { status: 500 });
  }
}
