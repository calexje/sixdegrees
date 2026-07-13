import { NextResponse } from "next/server";
import { getClubTeammates, OptionFilter } from "@/lib/db";

// Parses the shared league/season restriction from the query string, so the
// board's teammates stay inside the puzzle's graph for the filtered modes.
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

// The no-year board: teammates of a player at a club, across the seasons they
// were there, with the shared seasons for the path label.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const player = searchParams.get("player");
  const club = searchParams.get("club");

  if (!player || !club) {
    return NextResponse.json(
      { error: "Missing required parameter: player or club" },
      { status: 400 }
    );
  }
  return NextResponse.json(
    getClubTeammates(player, club, filterFromParams(searchParams))
  );
}
