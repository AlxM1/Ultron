import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "00raiser-Portal" },
    });

    clearTimeout(timeoutId);

    return NextResponse.json({
      online: response.ok,
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json({
      online: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
