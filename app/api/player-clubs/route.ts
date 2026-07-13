import { NextResponse } from "next/server";
import { getPlayerClubs } from "@/lib/db";

// Easy mode: a player's distinct clubs (season collapsed).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing required parameter: id" },
      { status: 400 }
    );
  }
  return NextResponse.json(getPlayerClubs(id));
}