import { NextResponse } from "next/server";
import { searchPlayers } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "search", 30, 10_000);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  return NextResponse.json(searchPlayers(query));
}
