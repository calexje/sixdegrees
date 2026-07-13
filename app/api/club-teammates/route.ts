import { NextResponse } from "next/server";
import { getClubTeammates } from "@/lib/db";

// Easy mode: teammates of a player at a club, across the seasons they were there.
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
  return NextResponse.json(getClubTeammates(player, club));
}