import Game from "@/components/game";
import ChallengeBuilder from "@/components/challenge-builder";
import PracticeConfig from "@/components/practice-config";
import {
  buildChallenge,
  generatePracticePuzzle,
  getPuzzle,
} from "@/lib/puzzle";
import { getCompetitions, getSeasonBounds } from "@/lib/db";

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
    leagues?: string;
    from_season?: string;
    to_season?: string;
    obscurity?: string;
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
  } else if (params.mode === "practice") {
    const leagues = params.leagues
      ? params.leagues.split(",")
      : [];
    const seasonFrom = params.from_season
      ? Number(params.from_season)
      : undefined;
    const seasonTo = params.to_season
      ? Number(params.to_season)
      : undefined;
    const obscurity = params.obscurity
      ? Number(params.obscurity)
      : 5;

    const puzzle = generatePracticePuzzle({
      leagues,
      seasonFrom,
      seasonTo,
      obscurity,
    });

    content = (
      <>
        <PracticeConfig
          leagues={getCompetitions()}
          bounds={getSeasonBounds()}
          current={{ leagues, seasonFrom, seasonTo, obscurity }}
        />
        <Game
          key={`practice:${puzzle.origin}:${puzzle.target}`}
          mode="practice"
          origin={puzzle.origin}
          target={puzzle.target}
          solutionDistance={puzzle.solutionDistance}
          solutionPath={puzzle.solutionPath}
        />
      </>
    );
  } else {
    const mode = params.mode === "expert" ? "expert" : "daily";
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

  return content;
}
