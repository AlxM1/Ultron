import { NextRequest, NextResponse } from "next/server";
import { fetchContentIntel } from "../_lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const limit = searchParams.get("limit") || "100";
    const offset = searchParams.get("offset") || "0";

    const query = new URLSearchParams({ limit, offset });
    if (search) query.set("search", search);

    const data = await fetchContentIntel(`/api/creators?${query}`);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch creators" }, { status: 502 });
  }
}
