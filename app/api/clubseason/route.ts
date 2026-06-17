import { NextResponse } from "next/server";
import { getClubSeasonFromPlayers } from "@/lib/db";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const club = searchParams.get("club");
    const season = searchParams.get("season");

    if (!club || !season) {
        return NextResponse.json(
            { error: "Missing required parameter: club or season", }, { status: 400 }
        );
    }
    const clubSeasons = getClubSeasonFromPlayers(club,season);
    return NextResponse.json(clubSeasons
    );
}