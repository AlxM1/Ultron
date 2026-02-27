import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { stdout } = await execAsync(
      'docker ps --format \'{"name":"{{.Names}}","status":"{{.Status}}","image":"{{.Image}}","ports":"{{.Ports}}"}\'',
      { timeout: 5000 }
    );
    const containers = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    return NextResponse.json({ containers });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message, containers: [] },
      { status: 500 }
    );
  }
}
