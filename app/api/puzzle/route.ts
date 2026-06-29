import { NextResponse } from "next/server";
import { getPuzzle } from "@/lib/puzzle";

type Mode = "daily" | "practice";

function isMode(value: string | null): value is Mode {
  return value === "daily" || value === "practice";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const rawMode = searchParams.get("mode");

  const mode: Mode = isMode(rawMode) ? rawMode : "daily";

  const puzzle = await getPuzzle(mode);

  return NextResponse.json(puzzle);
}