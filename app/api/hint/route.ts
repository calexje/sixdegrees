import { NextResponse } from "next/server";
import { bestMove, nodeLabel } from "@/lib/graph";
import { getGraphForMode } from "@/lib/puzzle";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "hint", 20, 10_000);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);

  const current = searchParams.get("current");
  const goal = searchParams.get("goal");

  if (!current || !goal) {
    return NextResponse.json(
      { error: "Missing required parameter: current or goal" },
      { status: 400 }
    );
  }

  const mode = searchParams.get("mode") ?? "daily";

  const notLeagues = searchParams.get("not_leagues");
  const notPlayer = searchParams.get("not_player");

  const graph = getGraphForMode(
    mode,
    notLeagues ? notLeagues.split(",") : []
  );

  const blocked = notPlayer
    ? new Set([`player:${notPlayer}`])
    : undefined;

  const suggestion = bestMove(graph, current, goal, blocked);

  return NextResponse.json({
    suggestion: suggestion ? nodeLabel(suggestion) : null,
  });
}
