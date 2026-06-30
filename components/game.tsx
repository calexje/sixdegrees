"use client";

import { useEffect, useState } from "react";
import { leagueName } from "@/lib/leagues";
import { formatSeason } from "@/lib/format";
import {
  recordDailyWin,
  recordDailyResult,
  getDailyResult,
} from "@/lib/stats";
import DailyResult from "@/components/daily-result";
import {
  difficultyFor,
  DIFFICULTY_CLASS,
} from "@/lib/difficulty";

type Props = {
    mode?: string;
    puzzleNumber?: number;
    originId: string;
    origin: string;
    targetId: string;
    target: string;
    solutionDistance: number | null;
    solutionPath?: string[];
    requiredWaypointId?: string;
    requiredWaypoint?: string;
    excludedPlayerId?: string;
    excludedPlayer?: string;
    notLeagues?: string[];
};

type ClubSeason = {
  clubId: string;
  club: string;
  season: string;
  competition?: string;
};

type PlayerRow = {
  id: string;
  name: string;
};

type PathNode =
  | {
      type: "player";
      id: string;
      name: string;
    }
  | {
      type: "clubseason";
      clubId: string;
      club: string;
      season: string;
    };

type Option = PathNode;

export default function Game({
  mode,
  puzzleNumber,
  originId,
  origin,
  targetId,
  target,
  solutionDistance,
  solutionPath,
  requiredWaypointId,
  requiredWaypoint,
  excludedPlayerId,
  excludedPlayer,
  notLeagues,
}: Props) {
  const [path, setPath] = useState<PathNode[]>([
    {
      type: "player",
      id: originId,
      name: origin,
    },
  ]);

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  // Hints reveal in stages from one button: 0 none, 1 most-recent club,
  // 2 full career; from stage 2 the button asks for "next move" suggestions,
  // which accumulate (newest first).
  const [hintStage, setHintStage] = useState(0);
  const [bestMoves, setBestMoves] = useState<string[]>(
    []
  );
  const [bestMoveLoading, setBestMoveLoading] =
    useState(false);
  const [targetCareer, setTargetCareer] =
    useState<ClubSeason[]>([]);

  const mostRecentClub =
    targetCareer.length > 0 
      ? targetCareer[0] : null;
  const [showWinModal, setShowWinModal] =
    useState(false);
  const [showOptimal, setShowOptimal] =
    useState(false);
  const [stats, setStats] = useState<{
    gamesPlayed: number;
    currentStreak: number;
  } | null>(null);
  // Set when today's Daily was already completed (lock-until-tomorrow).
  const [locked, setLocked] = useState<{
    moves: number;
    hints: number;
  } | null>(null);

  const current = path[path.length - 1];

  const passedWaypoint =
    !requiredWaypointId ||
    path.some(
      (node) =>
        node.type === "player" &&
        node.id === requiredWaypointId
    );

  const won =
    current.type === "player" &&
    current.id === targetId &&
    passedWaypoint;

  useEffect(() => {
    if (won) {
      setShowWinModal(true);

      // Only the Daily feeds the streak/games stats and the lock result.
      if (mode === "daily") {
        const today = new Date()
          .toISOString()
          .slice(0, 10);
        setStats(recordDailyWin(today));
        recordDailyResult({
          date: today,
          moves: path.length - 1,
          hints: hintStage + bestMoves.length,
        });
      }
    }
  }, [won, mode]);

  // On load, lock the Daily if it's already been completed today.
  useEffect(() => {
    if (mode !== "daily") return;
    const today = new Date()
      .toISOString()
      .slice(0, 10);
    const result = getDailyResult(today);
    if (result) {
      setLocked({
        moves: result.moves,
        hints: result.hints,
      });
    }
  }, [mode]);

  useEffect(() => {
    async function loadTargetCareer() {
      try {
        const response = await fetch(
          `/api/player?id=${encodeURIComponent(targetId)}`
        );
        setTargetCareer(await response.json());
      } catch {
        setTargetCareer([]);
      }
    }

    loadTargetCareer();
  }, [targetId]);

  useEffect(() => {
    // Track whether this is still the current node. If the player selects
    // another option before the fetch returns, this run is stale and its
    // results must be ignored, otherwise out-of-order responses could append an
    // option that belongs to a previous node.
    let active = true;

    async function loadOptions() {
      // Clear the list and show a loading state straight away so stale options
      // cannot be clicked while the next node's data is in flight.
      setLoading(true);
      setOptions([]);

      try {
        if (current.type === "player") {
          const response = await fetch(
            `/api/player?id=${encodeURIComponent(
              current.id
            )}`
          );

          const data: ClubSeason[] =
            await response.json();

          if (!active) return;

          setOptions(
            data
              .filter(
                (item) =>
                  !item.competition ||
                  !notLeagues?.includes(
                    item.competition
                  )
              )
              .map((item) => ({
                type: "clubseason",
                clubId: item.clubId,
                club: item.club,
                season: item.season,
              }))
          );
        } else {
          const response = await fetch(
            `/api/clubseason?club_id=${encodeURIComponent(
              current.clubId
            )}&season=${encodeURIComponent(
              current.season
            )}`
          );

          const data: PlayerRow[] =
            await response.json();

          if (!active) return;

          setOptions(
            data
              .filter(
                (item) => item.id !== excludedPlayerId
              )
              .map((item) => ({
                type: "player",
                id: item.id,
                name: item.name,
              }))
          );
        }
      } catch {
        // Network/parse failure: leave the options empty rather than hanging on
        // the loading state forever.
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOptions();

    return () => {
      active = false;
    };
  }, [current]);

  function selectOption(option: Option) {
    setPath([...path, option]);
  }

  function goBack() {
    if (path.length <= 1) {
      return;
    }

    setQuery("");
    setPath(path.slice(0, -1));
  }

  async function copyResults() {
    // window.location.href carries the current mode and any challenge params,
    // so the link works the same once the app is deployed.
    const targetText =
      `I connected ${origin} to ${target} in ${path.length - 1} moves`
    const hintText = ` and used ${hintCount} hint${hintCount === 1 ? "" : "s"}`;
    const afterText = `! Can you do better?\n${window.location.href}`;
    const shareText = targetText + (hintCount > 0 ? hintText : "") + afterText;

    try {
      await navigator.clipboard.writeText(shareText);
      alert("Results copied!");
    } catch {
      alert("Couldn't copy results to the clipboard.");
    }
  }

  // Asks the server which of the current options moves closest to the goal.
  // With a waypoint not yet reached, the goal is the waypoint; otherwise the
  // target.
  async function loadBestMove() {
    const goalId =
      requiredWaypointId && !passedWaypoint
        ? requiredWaypointId
        : targetId;

    const currentKey =
      current.type === "player"
        ? `player:${current.id}`
        : `clubseason:${current.clubId}:${current.season}`;

    const params = new URLSearchParams();
    params.set("mode", mode ?? "daily");
    params.set("current", currentKey);
    params.set("goal", `player:${goalId}`);
    if (notLeagues && notLeagues.length > 0) {
      params.set("not_leagues", notLeagues.join(","));
    }
    if (excludedPlayerId) {
      params.set("not_player", excludedPlayerId);
    }

    setBestMoveLoading(true);
    try {
      const response = await fetch(
        `/api/hint?${params.toString()}`
      );
      const data = await response.json();
      // Prepend so the latest suggestion shows on top.
      setBestMoves((prev) => [
        data.suggestion ?? "No move found",
        ...prev,
      ]);
    } finally {
      setBestMoveLoading(false);
    }
  }

  const filteredOptions = options.filter((option) => {
    const alreadyVisited = path.some((node) => {
      if (
        node.type === "player" &&
        option.type === "player"
      ) {
        return node.id === option.id;
      }

      if (
        node.type === "clubseason" &&
        option.type === "clubseason"
      ) {
        return (
          node.clubId === option.clubId &&
          node.season === option.season
        );
      }

      return false;
    });

    if (alreadyVisited) {
      return false;
    }

    const label =
      option.type === "player"
        ? option.name
        : `${option.club} (${formatSeason(option.season)})`;

    return label
      .toLowerCase()
      .includes(query.toLowerCase());
  });

  const hasSolution = solutionDistance !== null;

  const moveCount = path.length - 1;

  const moveCountLabel =
    `${moveCount} move${
      moveCount !== 1 ? "s" : ""
    }`;

  // Recent-club (stage 1) and career (stage 2) each count as one hint, plus one
  // per next-move suggestion.
  const hintCount = hintStage + bestMoves.length;

  const extraMoves = hasSolution
    ? moveCount - solutionDistance
    : null;

  const rating =
    extraMoves === null
      ? "🏁 Completed"
      : extraMoves === 0
      ? "⭐ Perfect"
      : extraMoves === 1
      ? "🟢 Excellent"
      : extraMoves === 2
      ? "🟡 Good"
      : "🔴 Completed";

  const hasConstraints =
    !!requiredWaypoint ||
    !!excludedPlayer ||
    (notLeagues?.length ?? 0) > 0;

  // Today's Daily is already done: show the result, not a replayable board.
  if (mode === "daily" && locked) {
    return (
      <DailyResult
        puzzleNumber={puzzleNumber}
        origin={origin}
        target={target}
        moves={locked.moves}
        hints={locked.hints}
      />
    );
  }

  return (
    <>
      {showWinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-background text-foreground border border-border rounded-lg shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-1">
              Football Degrees
              {puzzleNumber ? ` #${puzzleNumber}` : ""}
            </h2>

            <p className="text-lg mb-4 font-semibold text-primary-700 dark:text-primary-400">
              {rating}
            </p>

            <p className="mb-2">
              Success! You connected{" "}
              <strong>{origin}</strong> to{" "}
              <strong>{target}</strong> in{" "}
              <strong>{moveCount}</strong> moves
              {hintCount > 0
                ? ` with ${hintCount} hint${hintCount === 1 ? "" : "s"}.`
                : " with no hints."}
            </p>

            {hasSolution ? (
              <p className="mb-4 text-muted">
                The shortest solution was{" "}
                <strong>{solutionDistance}</strong> moves.
              </p>
            ) : (
              <p className="mb-4 text-muted">
                No known solution for these constraints.
              </p>
            )}

            <h3 className="font-bold mb-1 text-sm">
              Your route
            </h3>
            <div className="border border-border rounded-lg p-4 mb-4 text-sm leading-relaxed">
              {path.map((node, i) => (
                <span key={i}>
                  {node.type === "player"
                    ? node.name
                    : `${node.club} (${formatSeason(node.season)})`}
                  {i < path.length - 1 && " → "}
                </span>
              ))}
            </div>

            {solutionPath && solutionPath.length > 0 && (
              <div className="mb-4">
                {showOptimal ? (
                  <>
                    <h3 className="font-bold mb-1 text-sm">
                      Optimal route
                    </h3>
                    <div className="border border-border rounded-lg p-4 text-sm leading-relaxed">
                      {solutionPath.join(" → ")}
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setShowOptimal(true)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-100 dark:hover:bg-surface-800 transition"
                  >
                    Show optimal route
                  </button>
                )}
              </div>
            )}

            {mode === "daily" && stats && (
              <div className="border-t border-border pt-4 mb-4">
                <h3 className="font-bold mb-2">Statistics</h3>
                <p className="text-muted">
                  Current Streak: {stats.currentStreak}
                </p>
                <p className="text-muted">
                  Games Played: {stats.gamesPlayed}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={copyResults}
                className="px-4 py-2 rounded-lg bg-primary-500 text-black font-semibold hover:bg-primary-600 transition"
              >
                Copy Results
              </button>

              <button
                onClick={() => setShowWinModal(false)}
                className="px-4 py-2 rounded-lg border border-border hover:bg-surface-100 dark:hover:bg-surface-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="text-center mb-6">
          <p className="text-sm text-muted mb-1">
            Find a link between
          </p>
          <h2 className="text-xl font-bold">
            {origin}
            <span className="text-muted font-normal">
              {" "}
              and{" "}
            </span>
            {target}
          </h2>
          {solutionDistance !== null && (
            <div className="mt-2 flex items-center justify-center gap-2 text-sm">
              <span className="text-muted">
                {solutionDistance} moves apart
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${DIFFICULTY_CLASS[difficultyFor(solutionDistance)]}`}
              >
                {difficultyFor(solutionDistance)}
              </span>
            </div>
          )}
        </div>

        {hasConstraints && (
          <div className="border border-border rounded-lg p-3 mb-6 text-sm space-y-1">
            <div className="font-semibold">
              Challenge rules
            </div>
            {notLeagues && notLeagues.length > 0 && (
              <div className="text-muted">
                Excluded leagues:{" "}
                {notLeagues.map(leagueName).join(", ")}
              </div>
            )}
            {requiredWaypoint && (
              <div className="text-muted">
                Must pass through: {requiredWaypoint}
              </div>
            )}
            {excludedPlayer && (
              <div className="text-muted">
                Cannot use: {excludedPlayer}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {!won && (
            <div className="order-1 lg:order-2">
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-semibold">Next move</h3>
                <span className="text-xs text-muted">
                  {current.type === "player"
                    ? `${current.name}'s clubs`
                    : `${current.club} (${formatSeason(current.season)}) squad`}
                </span>
              </div>

              {loading ? (
                <div className="text-sm text-muted py-3">
                  {current.type === "player"
                    ? "Fetching clubs..."
                    : "Fetching players..."}
                </div>
              ) : (
                <>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />

                  <div className="rounded-lg border border-border divide-y divide-border overflow-hidden max-h-72 overflow-y-auto">
                    {filteredOptions.map((option, i) => {
                      const label =
                        option.type === "player"
                          ? option.name
                          : `${option.club} (${formatSeason(option.season)})`;

                      return (
                        <button
                          key={i}
                          onClick={() => {
                            selectOption(option);
                            setQuery("");
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-surface-100 dark:hover:bg-surface-800 transition"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="order-2 lg:order-1 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">
                  Your path{" "}
                  <span className="text-muted font-normal">
                    ({moveCountLabel})
                  </span>
                </h3>
                <button
                  onClick={goBack}
                  disabled={path.length <= 1}
                  className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-surface-100 dark:hover:bg-surface-800 transition disabled:opacity-50"
                >
                  ← Back
                </button>
              </div>

              <ol className="space-y-1">
                {path.map((node, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2"
                  >
                    {i > 0 && (
                      <span className="text-muted select-none">
                        ↳
                      </span>
                    )}
                    <span
                      className={
                        node.type === "player"
                          ? "font-medium"
                          : "text-sm text-muted"
                      }
                    >
                      {node.type === "player"
                        ? node.name
                        : `${node.club} (${formatSeason(node.season)})`}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {!won && (
              <div>
                <button
                  onClick={() => {
                    if (hintStage === 0) setHintStage(1);
                    else if (hintStage === 1)
                      setHintStage(2);
                    else loadBestMove();
                  }}
                  disabled={bestMoveLoading}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-100 dark:hover:bg-surface-800 transition disabled:opacity-50"
                >
                  {hintStage === 0
                    ? "💡 Hint: Target's recent club"
                    : hintStage === 1
                    ? "💡 Hint: Show Target's Career"
                    : bestMoveLoading
                    ? "💡 Finding next move..."
                    : "💡 Hint: Show Next Move"}
                </button>

                {/* Hints, newest first: next-move suggestions, then career,
                    then most recent club. */}
                <div className="mt-3 space-y-2">
                  {bestMoves.map((move, i) => (
                    <div key={i} className="text-sm">
                      <strong>Next move:</strong> {move}
                    </div>
                  ))}

                  {hintStage >= 2 && (
                    <div className="text-sm">
                      <strong>{target}&apos;s career:</strong>
                      <ul className="mt-2 list-disc list-inside text-muted">
                        {targetCareer.map((career, i) => (
                          <li key={i}>
                            {career.club} (
                            {formatSeason(career.season)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hintStage >= 1 && mostRecentClub && (
                    <div className="text-sm">
                      <strong>Most recent club:</strong>{" "}
                      {mostRecentClub.club} (
                      {formatSeason(mostRecentClub.season)})
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
