import {
  buildGraph,
  randomPath,
} from "./graph";

const graph = buildGraph();

function seededRandom(seed: string) {
  let h = 2166136261;

  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return function () {
    h += 0x6d2b79f5;

    let t = h;

    t = Math.imul(
      t ^ (t >>> 15),
      t | 1
    );

    t ^= t + Math.imul(
      t ^ (t >>> 7),
      t | 61
    );

    return (
      ((t ^ (t >>> 14)) >>> 0) /
      4294967296
    );
  };
}

function getDailySeed() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

export async function getPuzzle(seed?: string) {
const rng = seededRandom(seed ?? getDailySeed());

  const players = Array.from(
    graph.keys()
  ).filter((node) =>
    node.startsWith("player:")
  );

  while (true) {
    const startNode =
      players[
        Math.floor(
          rng() *
          players.length
        )
      ];

    const path =
      randomPath(
        graph,
        startNode,
        6,
        rng
      );

    if (!path) {
      continue;
    }

    const origin =
      startNode.replace(
        "player:",
        ""
      );

    const target =
      path[path.length - 1]
        .replace(
          "player:",
          ""
        );

    return {
      origin,
      target,
      solution: path,
    };
  }
}