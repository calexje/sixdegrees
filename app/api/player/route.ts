import { NextResponse } from "next/server";
import { getPlayerFromClubSeasons } from "@/lib/db";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const player = searchParams.get("name");

    if (!player) {
        return NextResponse.json(
            { error: "Missing required parameter: name", }, { status: 400 }
        );
    }
    const clubSeasons = getPlayerFromClubSeasons(player);
    return NextResponse.json(clubSeasons);
}