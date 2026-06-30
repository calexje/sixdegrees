import { NextResponse } from "next/server";
import { getPlayerClubSeasons } from "@/lib/db";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json(
            { error: "Missing required parameter: id", }, { status: 400 }
        );
    }
    return NextResponse.json(getPlayerClubSeasons(id));
}