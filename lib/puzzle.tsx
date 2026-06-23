import { buildGraph, randomPath } from "./graph";

const graph = buildGraph();
const DAILY_DISTANCE = 6;
const PRACTICE_DISTANCE = 1; //graph sees player -> team -> player as one jump, so 1 jump is 2 moves

function seededRandom(seed: string) {
  let h = 2166136261;

  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return function () {
    h += 0x6d2b79f5;

    let t = h;

    t = Math.imul(t ^ (t >>> 15), t | 1);

    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getDailySeed() {
  return new Date().toISOString().slice(0, 10);
}

function generatePuzzleFromSeed(seed: string) {
  const rng = seededRandom(seed);

  const players = Array.from(graph.keys()).filter((node) =>
    node.startsWith("player:")
  );

  while (true) {
    const startNode =
      players[Math.floor(rng() * players.length)];

    const path = randomPath(
  graph,
  startNode,
  DAILY_DISTANCE,
  rng
);

    if (!path) continue;

    return {
      origin: startNode.replace("player:", ""),
      target: path[path.length - 1].replace("player:", ""),
      solutionDistance: (path.length - 1) / 2,
      seed,
    };
  }
}

function generatePracticePuzzle() {
  const players = Array.from(graph.keys()).filter((node) =>
    node.startsWith("player:")
  );

  while (true) {
    const startNode =
      players[
        Math.floor(
          Math.random() * players.length
        )
      ];

    const path = randomPath(
      graph,
      startNode,
      PRACTICE_DISTANCE,
      Math.random
    );

    if (!path) {
      continue;
    }

    return {
      origin: startNode.replace(
        "player:",
        ""
      ),
      target: path[path.length - 1].replace(
        "player:",
        ""
      ),
      solutionDistance: path.length-1,
    };
  }
}

function generateDailyPuzzle() {
  const seed = getDailySeed();
  return generatePuzzleFromSeed(seed);
}

function generateChallengePuzzle() {
  const seed = "challenge-" + Math.floor(Math.random() * 1_000_000);
  const rng = seededRandom(seed);

  const players = Array.from(graph.keys()).filter((n) =>
    n.startsWith("player:")
  );

  const origin =
    players[Math.floor(rng() * players.length)];

  let target = origin;

  while (target === origin) {
    target =
      players[Math.floor(rng() * players.length)];
  }

  return {
    origin: origin.replace("player:", ""),
    target: target.replace("player:", ""),
    solution: null,
    seed,
  };
}

export type PuzzleMode = "daily" | "practice" | "challenge";

export async function getPuzzle(mode: PuzzleMode = "daily") {
   switch (mode) {
case "practice": {
  console.log("doing practice")
  return generatePracticePuzzle();
}

    case "challenge": {
      return generateChallengePuzzle();
    }

    case "daily":
    default: {
      console.log("doing daily?")
      const seed = getDailySeed();
      return generatePuzzleFromSeed(seed);
    }
  }
}