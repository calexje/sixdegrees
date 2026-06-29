import { NextResponse } from "next/server";
import { buildChallenge } from "@/lib/puzzle";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "validate", 20, 10_000);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing required parameter: from or to" },
      { status: 400 }
    );
  }

  const notLeagues = searchParams.get("not_leagues");

  const challenge = buildChallenge({
    fromId: from,
    toId: to,
    viaId: searchParams.get("via") ?? undefined,
    notPlayerId: searchParams.get("not_player") ?? undefined,
    notLeagues: notLeagues ? notLeagues.split(",") : [],
  });

  if (!challenge) {
    return NextResponse.json(
      { error: "Could not resolve origin or target" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    solvable: challenge.solvable,
    solutionDistance: challenge.solutionDistance,
  });
}
