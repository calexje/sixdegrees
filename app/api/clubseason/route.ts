import { NextResponse } from "next/server";
import { getClubSeasonPlayers } from "@/lib/db";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get("club_id");
    const season = searchParams.get("season");

    if (!clubId || !season) {
        return NextResponse.json(
            { error: "Missing required parameter: club_id or season", }, { status: 400 }
        );
    }
    return NextResponse.json(getClubSeasonPlayers(clubId, season));
}