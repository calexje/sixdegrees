import { NextResponse } from "next/server";
import { getPuzzle } from "@/lib/puzzle";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const date =
    searchParams.get("date") ??
    undefined;

  const puzzle = await getPuzzle(date);

  return NextResponse.json(puzzle);
}