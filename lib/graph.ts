import { Appearance, getAllAppearances } from "./db";

export type Graph = Map<string, Set<string>>;

function addEdge(
  graph: Graph,
  from: string,
  to: string
) {
  if (!graph.has(from)) {
    graph.set(from, new Set());
  }

  graph.get(from)!.add(to);
}

export function buildGraph(): Graph {
  const graph: Graph = new Map();

  const appearances = getAllAppearances();

  for (const appearance of appearances) {
    const playerNode =
      `player:${appearance.player}`;

    const clubSeasonNode =
      `clubseason:${appearance.club}:${appearance.season}`;

    addEdge(
      graph,
      playerNode,
      clubSeasonNode
    );

    addEdge(
      graph,
      clubSeasonNode,
      playerNode
    );
  }

  return graph;
}

export function findShortestPath(
  graph: Graph,
  start: string,
  target: string
): string[] | null {
  const queue: string[] = [start];

  const visited = new Set<string>();

  const parent = new Map<string, string>();

  visited.add(start);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === target) {
      const path: string[] = [];

      let node = target;

      while (node) {
        path.push(node);

        node = parent.get(node)!;
      }

      return path.reverse();
    }

    const neighbours =
      graph.get(current) ?? new Set();

    for (const neighbour of neighbours) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);

        parent.set(
          neighbour,
          current
        );

        queue.push(neighbour);
      }
    }
  }

  return null;
}

export function randomPath(
  graph: Graph,
  start: string,
  moves: number,
  rng: () => number
): string[] | null {
  const path = [start];

  const visited = new Set<string>();
  visited.add(start);

  let current = start;
  let playerMoves = 0;

  while (playerMoves < moves) {
    const neighbours = Array.from(
      graph.get(current) ?? []
    ).filter(
      (node) => !visited.has(node)
    );

    if (neighbours.length === 0) {
      return null;
    }

  const next =
  neighbours[
    Math.floor(
      rng() *
        neighbours.length
    )
  ];

    path.push(next);
    visited.add(next);
    current = next;

    if (
      next.startsWith("player:")
    ) {
      playerMoves++;
    }
  }

  return path;
}