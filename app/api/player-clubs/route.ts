import { NextResponse } from "next/server";
import { getPlayerClubs, OptionFilter } from "@/lib/db";

// Parses the shared league/season restriction from the query string, so the
// board's clubs stay inside the puzzle's graph for the filtered modes.
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

// The no-year board: a player's distinct clubs (season collapsed).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing required parameter: id" },
      { status: 400 }
    );
  }
  return NextResponse.json(
    getPlayerClubs(id, filterFromParams(searchParams))
  );
}
