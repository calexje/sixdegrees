import {
  Appearance,
  AppearanceFilter,
  getAllAppearances,
} from "./db";
import { formatSeason } from "./format";

export type Graph = Map<string, Set<string>>;

// Nodes are keyed by id (`player:<player_id>`, `clubseason:<club_id>:<season>`)
// so that distinct players/clubs sharing a name are never merged. This registry
// maps each node to its display label, populated as graphs are built. Every
// node that appears in any (filtered) graph also appears in the full graph, so
// the labels cover them all.
const nodeLabels = new Map<string, string>();

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

export function buildGraph(
  opts: AppearanceFilter = {}
): Graph {
  const graph: Graph = new Map();

  const appearances = getAllAppearances(opts);

  for (const appearance of appearances) {
    const playerNode = `player:${appearance.player_id}`;
    const clubSeasonNode =
      `clubseason:${appearance.club_id}:${appearance.season}`;

    if (!nodeLabels.has(playerNode)) {
      nodeLabels.set(playerNode, appearance.player_name);
    }
    if (!nodeLabels.has(clubSeasonNode)) {
      nodeLabels.set(
        clubSeasonNode,
        `${appearance.club_name} (${formatSeason(appearance.season)})`
      );
    }

    addEdge(graph, playerNode, clubSeasonNode);
    addEdge(graph, clubSeasonNode, playerNode);
  }

  return graph;
}

export function findShortestPath(
  graph: Graph,
  start: string,
  target: string,
  blocked?: Set<string>
): string[] | null {
  if (blocked?.has(start) || blocked?.has(target)) {
    return null;
  }

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
      if (blocked?.has(neighbour)) {
        continue;
      }

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

// Single BFS outward from `start`, returning every reachable node's distance
// (in edges) and parent, for reconstructing shortest paths. `maxDepth` caps the
// search depth in edges.
export function bfsFrom(
  graph: Graph,
  start: string,
  maxDepth?: number
): {
  distance: Map<string, number>;
  parent: Map<string, string>;
} {
  const distance = new Map<string, number>();
  const parent = new Map<string, string>();
  distance.set(start, 0);

  const queue: string[] = [start];

  while (queue.length > 0) {
    const node = queue.shift()!;
    const d = distance.get(node)!;

    if (maxDepth !== undefined && d >= maxDepth) {
      continue;
    }

    for (const neighbour of graph.get(node) ?? new Set()) {
      if (distance.has(neighbour)) continue;
      distance.set(neighbour, d + 1);
      parent.set(neighbour, node);
      queue.push(neighbour);
    }
  }

  return { distance, parent };
}

export function reconstructPath(
  parent: Map<string, string>,
  start: string,
  target: string
): string[] {
  const path: string[] = [];
  let node: string | undefined = target;

  while (node !== undefined) {
    path.push(node);
    if (node === start) break;
    node = parent.get(node);
  }

  return path.reverse();
}

// Shortest path (as node keys), optionally forced through a waypoint and/or
// blocking a set of nodes. Returns null if any required segment is unreachable.
export function shortestPathVia(
  graph: Graph,
  origin: string,
  target: string,
  via?: string,
  blocked?: Set<string>
): string[] | null {
  if (via) {
    const first = findShortestPath(graph, origin, via, blocked);
    const second = findShortestPath(graph, via, target, blocked);

    if (!first || !second) {
      return null;
    }

    // Drop the duplicated waypoint where the two segments join.
    return [...first, ...second.slice(1)];
  }

  return findShortestPath(graph, origin, target, blocked);
}

// Shortest distance in jumps (player -> player). A jump is a player-to-player
// hop, i.e. two graph edges. Returns null if unreachable.
export function shortestDistanceVia(
  graph: Graph,
  origin: string,
  target: string,
  via?: string,
  blocked?: Set<string>
): number | null {
  const path = shortestPathVia(graph, origin, target, via, blocked);
  return path ? (path.length - 1) / 2 : null;
}

// Among the (unblocked) neighbours of `current`, the one closest to `goal`.
// Runs a single BFS outward from the goal. Returns null if nothing is reachable.
export function bestMove(
  graph: Graph,
  current: string,
  goal: string,
  blocked?: Set<string>
): string | null {
  // BFS from the goal to get the distance of every reachable node.
  const distance = new Map<string, number>();
  const queue: string[] = [goal];
  distance.set(goal, 0);

  while (queue.length > 0) {
    const node = queue.shift()!;
    const d = distance.get(node)!;

    for (const neighbour of graph.get(node) ?? new Set()) {
      if (blocked?.has(neighbour)) continue;
      if (distance.has(neighbour)) continue;
      distance.set(neighbour, d + 1);
      queue.push(neighbour);
    }
  }

  let best: string | null = null;
  let bestDistance = Infinity;

  for (const neighbour of graph.get(current) ?? new Set()) {
    if (blocked?.has(neighbour)) continue;
    const d = distance.get(neighbour);
    if (d !== undefined && d < bestDistance) {
      bestDistance = d;
      best = neighbour;
    }
  }

  return best;
}

// Display label for a node id, from the registry populated during graph build.
export function nodeLabel(node: string): string {
  return nodeLabels.get(node) ?? node;
}

export function pathToLabels(path: string[]): string[] {
  return path.map(nodeLabel);
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