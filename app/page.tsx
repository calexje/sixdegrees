import Header from "@/components/header";
import Footer from "@/components/footer";
import Game from "@/components/game";
import ChallengeBuilder from "@/components/challenge-builder";
import { buildChallenge, getPuzzle, PuzzleMode } from "@/lib/puzzle";
import { getCompetitions } from "@/lib/db";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    from?: string;
    to?: string;
    via?: string;
    not_player?: string;
    not_leagues?: string;
  }>;
}) {
  const params = await searchParams;

  let content;

  if (params.mode === "challenge") {
    const challenge =
      params.from && params.to
        ? buildChallenge({
            fromId: params.from,
            toId: params.to,
            viaId: params.via,
            notPlayerId: params.not_player,
            notLeagues: params.not_leagues
              ? params.not_leagues.split(",")
              : [],
          })
        : null;

    content = challenge ? (
      <Game
        key={`challenge:${challenge.originId}:${challenge.targetId}:${challenge.viaId ?? ""}:${challenge.excludedId ?? ""}:${challenge.notLeagues.join(",")}`}
        mode="challenge"
        origin={challenge.origin}
        target={challenge.target}
        solutionDistance={challenge.solutionDistance}
        solutionPath={challenge.solutionPath ?? undefined}
        requiredWaypoint={challenge.via ?? undefined}
        excludedPlayer={challenge.excludedPlayer ?? undefined}
        notLeagues={challenge.notLeagues}
      />
    ) : (
      <ChallengeBuilder leagues={getCompetitions()} />
    );
  } else {
    const mode: PuzzleMode =
      params.mode === "practice" ||
      params.mode === "expert"
        ? params.mode
        : "daily";

    const puzzle = await getPuzzle(mode);

    content = (
      <Game
        key={`${mode}:${puzzle.origin}:${puzzle.target}`}
        mode={mode}
        origin={puzzle.origin}
        target={puzzle.target}
        solutionDistance={puzzle.solutionDistance}
        solutionPath={puzzle.solutionPath}
      />
    );
  }

  return (
    <>
      <Header />

      <main className="max-w-xl lg:max-w-4xl w-full mx-auto px-4 py-10">
        {content}
      </main>

      <Footer />
    </>
  );
}
