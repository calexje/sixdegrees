import { NextResponse } from "next/server";
import { getTargetDistances } from "@/lib/puzzle";
import { enforceRateLimit } from "@/lib/rate-limit";

// Distance (in moves) from a node to the puzzle's target, for per-move colour
// feedback. Reads a cached BFS-from-target, so it's one lookup per call. Called
// once per committed move, hence a higher limit than the hint endpoint.
export async function GET(request: Request) {
  const limited = enforceRateLimit(
    request,
    "distance",
    60,
    10_000
  );
  if (limited) return limited;

  const { searchParams } = new URL(request.url);

  const node = searchParams.get("node");
  const goal = searchParams.get("goal");

  if (!node || !goal) {
    return NextResponse.json(
      { error: "Missing required parameter: node or goal" },
      { status: 400 }
    );
  }

  const mode = searchParams.get("mode") ?? "daily";
  const notLeagues = searchParams.get("not_leagues");
  const notPlayer = searchParams.get("not_player");

  const distances = getTargetDistances(
    mode,
    goal,
    notLeagues ? notLeagues.split(",") : [],
    notPlayer ?? undefined
  );

  const distance = distances.get(node);

  return NextResponse.json({
    distance: distance ?? null,
  });
}
