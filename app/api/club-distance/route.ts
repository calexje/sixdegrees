import { NextResponse } from "next/server";
import { getTargetDistances } from "@/lib/puzzle";
import { getPlayerClubSeasons } from "@/lib/db";
import { clubSeasonNode, isNodeId } from "@/lib/graph";
import { enforceRateLimit } from "@/lib/rate-limit";

// Distance (in edges) from a collapsed club to the target: the closest of the
// player's club-seasons there — the best season to route through. The board
// hides seasons, so a club has no graph node of its own; we take the min over
// the player's seasons from the same cached BFS-from-target the player-step
// distances use (goal/mode/constraints mirror /api/distance), so the club's
// number and the players' numbers come from one map and stay consistent.
//
// Like /api/distance this only feeds the "N from target" readout — it never
// gates the option list, so the graph build it may trigger on a cold instance
// can't stall play. Seasons outside the mode's graph simply aren't in the map
// and drop out of the min.
export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "distance", 60, 10_000);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const player = searchParams.get("player");
  const club = searchParams.get("club");
  const goal = searchParams.get("goal");

  if (!player || !club || !goal) {
    return NextResponse.json(
      { error: "Missing required parameter: player, club or goal" },
      { status: 400 }
    );
  }

  // Untrusted URL input: `goal` keys the typed BFS, so narrow it to NodeId here.
  if (!isNodeId(goal)) {
    return NextResponse.json(
      { error: "Malformed node id: goal" },
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

  let min = Infinity;
  for (const cs of getPlayerClubSeasons(player)) {
    if (cs.clubId !== club) continue;
    const d = distances.get(clubSeasonNode(club, cs.season));
    if (d !== undefined && d < min) min = d;
  }

  return NextResponse.json({
    distance: Number.isFinite(min) ? min : null,
  });
}
