import { NextResponse } from "next/server";
import { bestMove, nodeLabel } from "@/lib/graph";
import { getGraphForMode, getTargetDistances } from "@/lib/puzzle";
import { getClubTeammates, OptionFilter } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit";

// The board's league/season restriction, so the teammate hint ranks the same
// options the board actually offers (Daily/Expert pass nothing).
function filterFromParams(params: URLSearchParams): OptionFilter {
  const leagues = params.get("leagues");
  const notLeagues = params.get("not_leagues");
  const from = params.get("from_season");
  const to = params.get("to_season");
  return {
    includeLeagues: leagues ? leagues.split(",") : undefined,
    excludeLeagues: notLeagues ? notLeagues.split(",") : undefined,
    seasonFrom: from ? Number(from) : undefined,
    seasonTo: to ? Number(to) : undefined,
  };
}

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
  const viaClub = searchParams.get("via_club");

  // On a club node the useful hint is the best *teammate* to pick here, not the
  // club you're already standing on. Rank the club's teammates (the exact board
  // options, from the player who led in) by distance to the goal, suggest the
  // closest. `current` is that prior player's node.
  if (viaClub && current.startsWith("player:")) {
    const priorId = current.slice("player:".length);
    const teammates = getClubTeammates(
      priorId,
      viaClub,
      filterFromParams(searchParams)
    );
    const distances = getTargetDistances(
      mode,
      goal,
      notLeagues ? notLeagues.split(",") : [],
      notPlayer ?? undefined
    );

    let best: { name: string; d: number } | null = null;
    for (const t of teammates) {
      if (t.id === priorId || t.id === notPlayer) continue;
      const d = distances.get(`player:${t.id}`);
      if (d === undefined) continue; // unreachable from the goal
      if (!best || d < best.d) best = { name: t.name, d };
    }

    return NextResponse.json({ suggestion: best ? best.name : null });
  }

  const graph = getGraphForMode(
    mode,
    notLeagues ? notLeagues.split(",") : []
  );

  const blocked = notPlayer
    ? new Set([`player:${notPlayer}`])
    : undefined;

  const suggestion = bestMove(graph, current, goal, blocked);

  // On a player node, the hint points at the club (team) to head through, not a
  // specific club-season — drop the year from the label.
  const label = suggestion
    ? suggestion.startsWith("clubseason:")
      ? nodeLabel(suggestion).replace(/\s*\(\d{4}\)\s*$/, "")
      : nodeLabel(suggestion)
    : null;

  return NextResponse.json({ suggestion: label });
}
