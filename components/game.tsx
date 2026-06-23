"use client";

import { useEffect, useState } from "react";

type Props = {
    origin: string;
    target: string;
    solutionDistance: number;
};

type ClubSeason = {
  club: string;
  season: string;
};

type Player = {
  player: string;
};

type PathNode =
  | {
      type: "player";
      value: string;
    }
  | {
      type: "clubseason";
      club: string;
      season: string;
    };

type Option = PathNode;

export default function Game({
  origin,
  target,
  solutionDistance
}: Props) {
  const [path, setPath] = useState<PathNode[]>([
    {
      type: "player",
      value: origin,
    },
  ]);

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [targetCareer, setTargetCareer] =
    useState<ClubSeason[]>([]);

  const mostRecentClub =
  targetCareer.length > 0
    ? targetCareer[0]
    : null;
  const [showWinModal, setShowWinModal] =
    useState(false);

  const current = path[path.length - 1];

  const won =
    current.type === "player" &&
    current.value === target;

  useEffect(() => {
    if (won) {
      setShowWinModal(true);
    }
  }, [won]);

  useEffect(() => {
    async function loadTargetCareer() {
      const response = await fetch(
        `/api/player?name=${encodeURIComponent(
          target
        )}`
      );

      const data = await response.json();

      setTargetCareer(data);
    }

    loadTargetCareer();
  }, [target]);

  useEffect(() => {
    async function loadOptions() {
      if (current.type === "player") {
        const response = await fetch(
          `/api/player?name=${encodeURIComponent(
            current.value
          )}`
        );

        const data: ClubSeason[] =
          await response.json();

        setOptions(
          data.map((item) => ({
            type: "clubseason",
            club: item.club,
            season: item.season,
          }))
        );
      } else {
        const response = await fetch(
          `/api/clubseason?club=${encodeURIComponent(
            current.club
          )}&season=${encodeURIComponent(
            current.season
          )}`
        );

        const data: Player[] =
          await response.json();

        setOptions(
          data.map((item) => ({
            type: "player",
            value: item.player,
          }))
        );
      }
    }

    loadOptions();
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
    const shareText =
      `I connected ${origin} to ${target} in ${path.length - 1} moves! Can you do better?`;

    await navigator.clipboard.writeText(
      shareText
    );
  }

const filteredOptions = options.filter((option) => {
    const alreadyVisited = path.some((node) => {
        if (
            node.type === "player" &&
            option.type === "player"
        ) {
            return node.value === option.value;
        }

        if (
            node.type === "clubseason" &&
            option.type === "clubseason"
        ) {
            return (
                node.club === option.club &&
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
            ? option.value
            : `${option.club} (${option.season})`;

    return label
        .toLowerCase()
        .includes(query.toLowerCase());
});

  const currentGame =
    `${origin} and ${target} (${solutionDistance} moves apart)`;

  const moveCount = path.length - 1;

  const moveCountLabel =
    `${moveCount} move${
      moveCount !== 1 ? "s" : ""
    }`;

  // TODO: real values
  const puzzleNumber = 1;
  
  const extraMoves =
    moveCount - solutionDistance;

  return (
    <>
      {showWinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black text-black rounded-xl shadow-2xl p-6 w-full max-w-xl text-white">
            <h2 className="text-2xl font-bold mb-4">
              Football Degrees #
              {puzzleNumber}
            </h2>

            <p className="text-lg mb-4">
              {extraMoves === 0 &&
                "⭐ Perfect"}
              {extraMoves === 1 &&
                "🟢 Excellent"}
              {extraMoves === 2 &&
                "🟡 Good"}
              {extraMoves >= 3 &&
                "🔴 Completed"}
            </p>

            <p className="mb-2">
              Success! You connected{" "}
              <strong>{origin}</strong> to{" "}
              <strong>{target}</strong> in{" "}
              <strong>{moveCount}</strong>{" "}
              moves.
            </p>

            <p className="mb-4">
              The shortest solution was{" "}
              <strong>
                {solutionDistance}
              </strong>{" "}
              moves.
            </p>

            <div className="border rounded p-4 mb-4">
              {path.map((node, i) => (
                <span key={i}>
                  {node.type === "player"
                    ? node.value
                    : `${node.club} (${node.season})`}

                  {i <
                    path.length - 1 &&
                    " → "}
                </span>
              ))}
            </div>

            <div className="border-t pt-4 mb-4">
              <h3 className="font-bold mb-2">
                Statistics
              </h3>

              <p>Current Streak: 1</p>
              <p>Games Played: 1</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyResults}
                className="px-4 py-2 border rounded"
              >
                Copy Results
              </button>

              <button
                onClick={() =>
                  setShowWinModal(false)
                }
                className="px-4 py-2 border rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="border p-4">
          <h3 className="text-xl font-bold mb-4">
            Find a link between
          </h3>

          <h4 className="text-sm mb-4">
            {currentGame}
          </h4>
            <button
            onClick={() =>
                setHintLevel(
                Math.min(hintLevel + 1, 3)
                )
            }
            className="border rounded px-3 py-1 text-sm"
            >
            💡 Hint
            </button>
<div className="mt-4 space-y-2">
  {hintLevel >= 1 &&
    mostRecentClub && (
      <div className="text-sm">
        <strong>
          Most Recent Club:
        </strong>{" "}
        {mostRecentClub.club}
        {" "}
        (
        {mostRecentClub.season}
        )
      </div>
    )}

  {hintLevel >= 2 && (
    <div className="text-sm">
      <strong>
        Shortest Solution:
      </strong>{" "}
      {solutionDistance}
      {" "}
      moves
    </div>
  )}

  {hintLevel >= 3 && (
    <div className="text-sm">
      <strong>
        Full Career:
      </strong>

      <ul className="mt-2">
        {targetCareer.map(
          (career, i) => (
            <li key={i}>
              {career.club}
              {" "}
              (
              {career.season}
              )
            </li>
          )
        )}
      </ul>
    </div>
  )}
</div>

          <h3 className="text-xl font-bold mb-4">
            Path ({moveCountLabel})
          </h3>
            <button
                onClick={goBack}
                disabled={path.length <= 1}
                className="border rounded px-3 py-1 text-sm mb-4 disabled:opacity-50">
                ← Back
            </button>

          <ul>
            {path.map((node, i) => (
              <li
                key={i}
                className="py-2"
              >
                {node.type === "player"
                  ? node.value
                  : `${node.club} (${node.season})`}
              </li>
            ))}
          </ul>
        </div>

        <div className="border p-4">
          {!won && (
            <>
              <h3 className="text-xl font-bold mb-4">
                Next Move
              </h3>

              <h4 className="text-sm text-gray-500 mb-4">
                {current.type === "player"
                  ? `Showing ${current.value}'s Career`
                  : `Showing ${current.club} (${current.season}) Squad`}
              </h4>

              <input
                value={query}
                onChange={(e) =>
                  setQuery(
                    e.target.value
                  )
                }
                placeholder="Search..."
                className="w-full border rounded p-2 mb-3"
              />

              <div className="border rounded">
                {filteredOptions.map(
                  (option, i) => {
                    const label =
                      option.type ===
                      "player"
                        ? option.value
                        : `${option.club} (${option.season})`;

                    return (
                      <button
                        key={i}
                        onClick={() => {
                          selectOption(
                            option
                          );
                          setQuery("");
                        }}
                        className="
                          w-full
                          text-left
                          px-3
                          py-2
                          border-b
                          hover:bg-gray-50
                          hover:text-black
                          transition
                        "
                      >
                        {label}
                      </button>
                    );
                  }
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}