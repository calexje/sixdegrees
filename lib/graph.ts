import {
  Appearance,
  AppearanceFilter,
  getAllAppearances,
} from "./db";
import { formatSeason } from "./format";

// A node id is either a player or a specific club-season. Encoding the shape in
// the type (rather than a bare `string`) makes the compiler reject bare ids,
// typo'd prefixes, and passing one kind where the other is expected — all at
// zero runtime cost. The slots are `${string}` (not `${number}`) because
// player_id, club_id and season are all typed `string` in the DB layer (./db).
export type NodeId =
  | `player:${string}`
  | `clubseason:${string}:${string}`;

export type Graph = Map<NodeId, Set<NodeId>>;

// Constructors — the single source of truth for the id format. Callers build
// ids through these rather than interpolating strings by hand, so the shape
// lives in one place and every id produced is a genuine `NodeId`. (A bare
// template literal like `player:${id}` is inferred as `string`, not `NodeId`,
// so hand-built ids wouldn't satisfy the type anyway.)
export function playerNode(id: string): NodeId {
  return `player:${id}`;
}

export function clubSeasonNode(clubId: string, season: string): NodeId {
  return `clubseason:${clubId}:${season}`;
}

// Runtime guard for untrusted input (e.g. ids arriving as URL params). Narrows a
// plain `string` to `NodeId` so it can safely cross into the typed graph API.
// This is where runtime validation belongs — at the boundary — complementing
// the compile-time guarantees the type gives everywhere inside.
export function isNodeId(value: string): value is NodeId {
  return /^player:.+$/.test(value) || /^clubseason:.+:.+$/.test(value);
}

// Nodes are keyed by id (`player:<player_id>`, `clubseason:<club_id>:<season>`)
// so that distinct players/clubs sharing a name are never merged. This registry
// maps each node to its display label, populated as graphs are built. Every
// node that appears in any (filtered) graph also appears in the full graph, so
// the labels cover them all.
const nodeLabels = new Map<NodeId, string>();

function addEdge(
  graph: Graph,
  from: NodeId,
  to: NodeId
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
    const player = playerNode(appearance.player_id);
    const clubSeason = clubSeasonNode(
      appearance.club_id,
      appearance.season
    );

    if (!nodeLabels.has(player)) {
      nodeLabels.set(player, appearance.player_name);
    }
    if (!nodeLabels.has(clubSeason)) {
      nodeLabels.set(
        clubSeason,
        `${appearance.club_name} (${formatSeason(appearance.season)})`
      );
    }

    addEdge(graph, player, clubSeason);
    addEdge(graph, clubSeason, player);
  }

  return graph;
}

export function findShortestPath(
  graph: Graph,
  start: NodeId,
  target: NodeId,
  blocked?: Set<NodeId>
): NodeId[] | null {
  if (blocked?.has(start) || blocked?.has(target)) {
    return null;
  }

  const queue: NodeId[] = [start];

  const visited = new Set<NodeId>();

  const parent = new Map<NodeId, NodeId>();

  visited.add(start);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === target) {
      const path: NodeId[] = [];

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
// search depth in edges; `blocked` nodes are treated as absent.
export function bfsFrom(
  graph: Graph,
  start: NodeId,
  maxDepth?: number,
  blocked?: Set<NodeId>
): {
  distance: Map<NodeId, number>;
  parent: Map<NodeId, NodeId>;
} {
  const distance = new Map<NodeId, number>();
  const parent = new Map<NodeId, NodeId>();

  if (blocked?.has(start)) {
    return { distance, parent };
  }

  distance.set(start, 0);

  const queue: NodeId[] = [start];

  while (queue.length > 0) {
    const node = queue.shift()!;
    const d = distance.get(node)!;

    if (maxDepth !== undefined && d >= maxDepth) {
      continue;
    }

    for (const neighbour of graph.get(node) ?? new Set()) {
      if (blocked?.has(neighbour)) continue;
      if (distance.has(neighbour)) continue;
      distance.set(neighbour, d + 1);
      parent.set(neighbour, node);
      queue.push(neighbour);
    }
  }

  return { distance, parent };
}

export function reconstructPath(
  parent: Map<NodeId, NodeId>,
  start: NodeId,
  target: NodeId
): NodeId[] {
  const path: NodeId[] = [];
  let node: NodeId | undefined = target;

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
  origin: NodeId,
  target: NodeId,
  via?: NodeId,
  blocked?: Set<NodeId>
): NodeId[] | null {
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
  origin: NodeId,
  target: NodeId,
  via?: NodeId,
  blocked?: Set<NodeId>
): number | null {
  const path = shortestPathVia(graph, origin, target, via, blocked);
  return path ? (path.length - 1) / 2 : null;
}

// Among the (unblocked) neighbours of `current`, the one closest to `goal`.
// Runs a single BFS outward from the goal. Returns null if nothing is reachable.
export function bestMove(
  graph: Graph,
  current: NodeId,
  goal: NodeId,
  blocked?: Set<NodeId>
): NodeId | null {
  // BFS from the goal to get the distance of every reachable node.
  const distance = new Map<NodeId, number>();
  const queue: NodeId[] = [goal];
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

  let best: NodeId | null = null;
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
export function nodeLabel(node: NodeId): string {
  return nodeLabels.get(node) ?? node;
}

export function pathToLabels(path: NodeId[]): string[] {
  return path.map(nodeLabel);
}

export function randomPath(
  graph: Graph,
  start: NodeId,
  moves: number,
  rng: () => number
): NodeId[] | null {
  const path: NodeId[] = [start];

  const visited = new Set<NodeId>();
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
        Math.floor(rng() * neighbours.length)
      ];

    path.push(next);
    visited.add(next);
    current = next;

    if (next.startsWith("player:")) {
      playerMoves++;
    }
  }

  return path;
}
