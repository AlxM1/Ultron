import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROADMAP_PATH = process.env.ROADMAP_PATH || "/data/roadmap.json";

export async function GET() {
  try {
    if (!fs.existsSync(ROADMAP_PATH)) {
      return NextResponse.json({ error: "Roadmap data not found" }, { status: 404 });
    }

    const raw = fs.readFileSync(ROADMAP_PATH, "utf-8");
    const data = JSON.parse(raw);

    // Enrich with computed progress percentages
    const phases = data.phases.map((phase: any) => {
      const total = phase.tasks.length;
      const done = phase.tasks.filter((t: any) => t.status === "done").length;
      const inProgress = phase.tasks.filter((t: any) => t.status === "in-progress").length;
      const progress = total > 0 ? Math.round(((done + inProgress * 0.5) / total) * 100) : 0;

      return {
        ...phase,
        progress,
        taskCounts: { total, done, inProgress, notStarted: total - done - inProgress },
      };
    });

    const stat = fs.statSync(ROADMAP_PATH);

    return NextResponse.json({
      lastUpdated: data.lastUpdated,
      fileUpdatedAt: stat.mtime.toISOString(),
      phases,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
