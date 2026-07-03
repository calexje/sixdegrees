import { readFileSync } from "fs";
import path from "path";
import {
  buildGraph,
  bfsFrom,
  reconstructPath,
  shortestPathVia,
  pathToLabels,
  nodeLabel,
  Graph,
} from "./graph";
import {
  getPlayerById,
  getCompetitions,
  getProminentPlayerIds,
  getRecentPlayerIds,
} from "./db";
import {
  OBSCURITY_MIN_SEASONS,
  DAILY_MIN_TOP_FLIGHT_SEASONS,
} from "./prominence";

// Expert mode uses every competition in the dataset; the daily puzzle is
// restricted to the Premier League (competition "GB1"). Both are built lazily
// and memoised on first use rather than at module load: a Daily or Practice
// request shouldn't pay to build the (much larger) full multi-league graph it
// never touches, which dominated cold-start time.
let _fullGraph: Graph | null = null;
let _premierLeagueGraph: Graph | null = null;

function timed<T>(label: string, build: () => T): T {
  const start = performance.now();
  const result = build();
  const ms = Math.round(performance.now() - start);
  console.log(`[graph] built ${label} in ${ms}ms`);
  return result;
}

function fullGraph(): Graph {
  if (!_fullGraph) _fullGraph = timed("full", () => buildGraph());
  return _fullGraph;
}

function premierLeagueGraph(): Graph {
  if (!_premierLeagueGraph) {
    _premierLeagueGraph = timed("premier-league", () =>
      buildGraph({ competition: "GB1" })
    );
  }
  return _premierLeagueGraph;
}

const EXPERT_DISTANCE = 6;
// Practice difficulty in moves (selections). A move is one step; a hop
// (player -> club -> player) is two, so move counts are always even. Capped at
// 10 (5 hops): 12-move/6-hop pairs are too rare to offer reliably.
const PRACTICE_DEFAULT_MOVES = 4;
const PRACTICE_MAX_MOVES = 10;

// Generated puzzles never go below this many jumps. A 1-jump puzzle is two
// players who shared a club (e.g. Tonali and Donnarumma at Milan), which is
// trivial; 2+ jumps forces a link through an intermediate player.
const MIN_JUMPS = 2;

// Prominence gating: the set of player nodes with at least `minSeasons`
// top-flight seasons. Memoised per threshold (it's a GROUP BY over every
// appearance, so we don't want to repeat it on each Practice generation).
const prominentIdsCache = new Map<number, Set<string>>();
function prominentPlayerNodes(minSeasons: number): Set<string> {
  let ids = prominentIdsCache.get(minSeasons);
  if (!ids) {
    ids = getProminentPlayerIds(minSeasons);
    prominentIdsCache.set(minSeasons, ids);
  }
  return new Set(Array.from(ids, (id) => `player:${id}`));
}

// Player nodes active in `minSeason` or later. Memoised per threshold, same as
// prominence. Used to keep the Daily's target a recent, recognisable player.
const recentIdsCache = new Map<number, Set<string>>();
function recentPlayerNodes(minSeason: number): Set<string> {
  let ids = recentIdsCache.get(minSeason);
  if (!ids) {
    ids = getRecentPlayerIds(minSeason);
    recentIdsCache.set(minSeason, ids);
  }
  return new Set(Array.from(ids, (id) => `player:${id}`));
}

// The Daily target must have played within this many years of the puzzle date,
// so the player people are aiming for is someone they're likely to know.
const DAILY_TARGET_RECENT_YEARS = 10;

// Daily uses only reasonably recognisable players (prominence >= 3) so it stays
// gettable. Computed lazily so non-Daily requests skip the GROUP BY query.
let _dailyAllowedPlayers: Set<string> | null = null;
function dailyAllowedPlayers(): Set<string> {
  if (!_dailyAllowedPlayers) {
    _dailyAllowedPlayers = prominentPlayerNodes(
      DAILY_MIN_TOP_FLIGHT_SEASONS
    );
  }
  return _dailyAllowedPlayers;
}

// The daily puzzle picks a distance in this range (inclusive) from the date
// seed, so its difficulty is stable for the day and exposed via solutionDistance.
const DAILY_MIN_DISTANCE = 2;
const DAILY_MAX_DISTANCE = 6;

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

// Daily puzzle number, counting up from launch. Set the epoch to your launch
// date (UTC); that day is #1.
const DAILY_EPOCH = Date.UTC(2026, 5, 30); // 2026-06-30
function dailyNumber(seed: string): number {
  const day = Date.parse(`${seed}T00:00:00Z`);
  return Math.floor((day - DAILY_EPOCH) / 86_400_000) + 1;
}

// Picks an origin and a target that are a genuine shortest distance apart, then
// reports that shortest path. `targetJumps` is the desired difficulty in jumps
// (player-to-player hops); if no player sits exactly that far away we fall back
// to the farthest reachable player within that bound. solutionDistance is in
// moves (selections / graph edges), matching how the player's moves are counted.
// Football is small-world: most players sit within a few hops, so exactly-N-hop
// pairs get rarer as N grows. A single random start often has no node at the
// requested distance. We try a few starts to honour the target, keeping the
// closest-below as we go, and return as soon as we hit it exactly. Easy targets
// are found on the first try, so this adds no cost there.
const TARGET_ATTEMPTS = 8;

function generatePuzzle(
  graph: Graph,
  targetJumps: number,
  rng: () => number,
  allowed?: Set<string>,
  // When set, the target (but not the origin) must also be in this set. Used by
  // the Daily to force a recent, recognisable target.
  targetAllowed?: Set<string>
) {
  const players = Array.from(graph.keys()).filter(
    (node) =>
      node.startsWith("player:") &&
      (!allowed || allowed.has(node))
  );

  type Found = {
    startNode: string;
    target: string;
    parent: Map<string, string>;
    jumps: number;
  };

  // One random start: the best (highest, capped at target) reachable pair, or
  // null if nothing sits at or above the floor.
  function attempt(): Found | null {
    const startNode =
      players[Math.floor(rng() * players.length)];

    const { distance, parent } = bfsFrom(
      graph,
      startNode,
      targetJumps * 2
    );

    const byJumps = new Map<number, string[]>();
    for (const [node, edges] of distance) {
      if (
        edges === 0 ||
        edges % 2 !== 0 ||
        !node.startsWith("player:") ||
        (allowed && !allowed.has(node)) ||
        (targetAllowed && !targetAllowed.has(node))
      ) {
        continue;
      }
      const jumps = edges / 2;
      const bucket = byJumps.get(jumps) ?? [];
      bucket.push(node);
      byJumps.set(jumps, bucket);
    }

    // Prefer the requested difficulty; otherwise the closest available down to
    // the floor. Never go below MIN_JUMPS (no trivial same-club puzzles).
    let jumps = 0;
    for (let j = targetJumps; j >= MIN_JUMPS; j--) {
      if (byJumps.has(j)) {
        jumps = j;
        break;
      }
    }

    if (jumps === 0) return null;

    const bucket = byJumps.get(jumps)!;
    const target =
      bucket[Math.floor(rng() * bucket.length)];

    return { startNode, target, parent, jumps };
  }

  function build(found: Found) {
    const path = reconstructPath(
      found.parent,
      found.startNode,
      found.target
    );
    return {
      originId: found.startNode.slice("player:".length),
      origin: nodeLabel(found.startNode),
      targetId: found.target.slice("player:".length),
      target: nodeLabel(found.target),
      solutionDistance: path.length - 1,
      solutionPath: pathToLabels(path),
    };
  }

  let best: Found | null = null;
  for (let i = 0; i < TARGET_ATTEMPTS; i++) {
    const found = attempt();
    if (!found) continue;
    if (found.jumps === targetJumps) {
      return build(found);
    }
    if (!best || found.jumps > best.jumps) {
      best = found;
    }
  }

  if (best) return build(best);

  // Pathological pool (e.g. over-restrictive filters): keep trying for any
  // valid pair at or above the floor.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = attempt();
    if (found) return build(found);
  }
}

// Practice graphs are filtered by league and season. The unfiltered case reuses
// the module-level fullGraph; filtered ones are built on demand and cached
// (bounded, oldest-out) like challenge graphs.
const practiceGraphCache = new Map<string, Graph>();

function getPracticeGraph(
  leagues: string[],
  seasonFrom?: number,
  seasonTo?: number
): Graph {
  const noFilter =
    leagues.length === 0 &&
    seasonFrom === undefined &&
    seasonTo === undefined;
  if (noFilter) return fullGraph();

  const key = `${[...leagues].sort().join(",")}|${seasonFrom ?? ""}|${seasonTo ?? ""}`;
  const cached = practiceGraphCache.get(key);
  if (cached) return cached;

  const graph = buildGraph({
    includeLeagues: leagues.length > 0 ? leagues : undefined,
    seasonFrom,
    seasonTo,
  });

  if (practiceGraphCache.size >= MAX_CACHED_GRAPHS) {
    const oldest = practiceGraphCache.keys().next().value;
    if (oldest !== undefined) {
      practiceGraphCache.delete(oldest);
    }
  }
  practiceGraphCache.set(key, graph);
  return graph;
}

export type PracticeFilters = {
  leagues?: string[];
  seasonFrom?: number;
  seasonTo?: number;
  obscurity?: number;
  moves?: number;
};

export function generatePracticePuzzle(
  filters: PracticeFilters = {}
) {
  const leagues = sanitizeLeagues(filters.leagues ?? []);
  const graph = getPracticeGraph(
    leagues,
    filters.seasonFrom,
    filters.seasonTo
  );

  const obscurity = filters.obscurity ?? 5;
  const minSeasons = OBSCURITY_MIN_SEASONS[obscurity];
  const allowed =
    minSeasons === undefined
      ? undefined
      : prominentPlayerNodes(minSeasons);

  // Difficulty in moves; clamp to [floor, max] then convert to jumps (2 moves
  // per hop) for generation.
  const moves = Math.min(
    Math.max(
      filters.moves ?? PRACTICE_DEFAULT_MOVES,
      MIN_JUMPS * 2
    ),
    PRACTICE_MAX_MOVES
  );

  return generatePuzzle(
    graph,
    Math.round(moves / 2),
    Math.random,
    allowed
  );
}

// Daily and Expert puzzles are seeded by the date, so they're identical for the
// whole UTC day. Without memoisation the BFS search (expensive on the full
// Expert graph) re-runs on every request; instead each is cached in a single
// slot that self-invalidates when the seed (date) changes.
type GeneratedPuzzle = ReturnType<typeof generatePuzzle>;
type ExpertPuzzle = GeneratedPuzzle & { seed: string };
let _dailyCache:
  | { seed: string; puzzle: GeneratedPuzzle & { seed: string; puzzleNumber: number } }
  | null = null;
let _expertCache: { seed: string; puzzle: ExpertPuzzle } | null = null;

// Expert puzzles are deterministic per date but the BFS search over the full
// graph is slow (~seconds on a cold start). The import script precomputes a
// horizon of upcoming days into database/expert-puzzles.json; if today's seed
// is in there, the page serves it without building the graph or searching at
// all. Missing file or out-of-horizon dates fall back to live generation.
const precomputedExpert: Map<string, ExpertPuzzle> = (() => {
  try {
    const raw = readFileSync(
      path.join(process.cwd(), "database", "expert-puzzles.json"),
      "utf8"
    );
    const data = JSON.parse(raw) as {
      puzzles?: Record<string, ExpertPuzzle>;
    };
    return new Map(Object.entries(data.puzzles ?? {}));
  } catch {
    return new Map();
  }
})();

function generateDailyPuzzle() {
  const seed = getDailySeed();
  if (_dailyCache && _dailyCache.seed === seed) return _dailyCache.puzzle;

  const rng = seededRandom(seed);

  // The daily difficulty (in jumps) is the same for everyone on a given day.
  const span = DAILY_MAX_DISTANCE - DAILY_MIN_DISTANCE + 1;
  const targetJumps =
    DAILY_MIN_DISTANCE + Math.floor(rng() * span);

  // Force the target to a recent player (active within the last N years of the
  // puzzle date), so the player people are aiming for is recognisable. The
  // origin stays any prominent player. Derived from the seed's year, so it's
  // deterministic per day.
  const puzzleYear = Number(seed.slice(0, 4));
  const recentTargets = recentPlayerNodes(
    puzzleYear - DAILY_TARGET_RECENT_YEARS
  );

  const puzzle = {
    ...generatePuzzle(
      premierLeagueGraph(),
      targetJumps,
      rng,
      dailyAllowedPlayers(),
      recentTargets
    ),
    seed,
    puzzleNumber: dailyNumber(seed),
  };
  _dailyCache = { seed, puzzle };
  return puzzle;
}

// The live Expert generation for a given date seed. Exported so the precompute
// script produces puzzles byte-identical to what this would generate at runtime.
export function generateExpertPuzzleForSeed(seed: string): ExpertPuzzle {
  return {
    ...generatePuzzle(fullGraph(), EXPERT_DISTANCE, seededRandom(seed)),
    seed,
  };
}

function generateExpertPuzzle() {
  const seed = getDailySeed();
  if (_expertCache && _expertCache.seed === seed) return _expertCache.puzzle;

  const puzzle =
    precomputedExpert.get(seed) ?? generateExpertPuzzleForSeed(seed);
  _expertCache = { seed, puzzle };
  return puzzle;
}

// The set of real competition codes, used to reject arbitrary league values
// from the URL before they reach the cache or a graph build.
const VALID_LEAGUES = new Set(getCompetitions());

// Challenges restricted to a subset of leagues need their own graph. The full
// graph (no exclusions) is reused directly; other filters are built on demand
// and cached by their sorted exclusion key. The cache is bounded and evicts the
// oldest entry so a flood of distinct filters cannot exhaust memory.
const challengeGraphCache = new Map<string, Graph>();
const MAX_CACHED_GRAPHS = 24;

// Keeps only real competition codes, deduplicated. Anything else is dropped so
// it can neither create cache entries nor trigger a graph build.
function sanitizeLeagues(notLeagues: string[]): string[] {
  return [...new Set(notLeagues)].filter((code) =>
    VALID_LEAGUES.has(code)
  );
}

function getChallengeGraph(notLeagues: string[]): Graph {
  if (notLeagues.length === 0) {
    return fullGraph();
  }

  const key = [...notLeagues].sort().join(",");

  const cached = challengeGraphCache.get(key);
  if (cached) return cached;

  const graph = buildGraph({ excludeLeagues: notLeagues });

  if (challengeGraphCache.size >= MAX_CACHED_GRAPHS) {
    const oldest = challengeGraphCache.keys().next().value;
    if (oldest !== undefined) {
      challengeGraphCache.delete(oldest);
    }
  }

  challengeGraphCache.set(key, graph);
  return graph;
}

export type ChallengeParams = {
  fromId: string;
  toId: string;
  viaId?: string;
  notPlayerId?: string;
  notLeagues?: string[];
};

export type Challenge = {
  origin: string;
  target: string;
  originId: string;
  targetId: string;
  via: string | null;
  viaId: string | null;
  excludedPlayer: string | null;
  excludedId: string | null;
  notLeagues: string[];
  solutionDistance: number | null;
  solutionPath: string[] | null;
  solvable: boolean;
};

// Resolves the URL parameters of a shared challenge into a playable puzzle.
// Player ids are resolved to names for the (name-keyed) graph and for display.
// Returns null when the origin or target id cannot be resolved.
export function buildChallenge(
  params: ChallengeParams
): Challenge | null {
  const from = getPlayerById(params.fromId);
  const to = getPlayerById(params.toId);

  if (!from || !to) {
    return null;
  }

  const via = params.viaId
    ? getPlayerById(params.viaId)
    : undefined;

  const excluded = params.notPlayerId
    ? getPlayerById(params.notPlayerId)
    : undefined;

  const notLeagues = sanitizeLeagues(params.notLeagues ?? []);

  const graph = getChallengeGraph(notLeagues);

  const blocked = excluded
    ? new Set([`player:${excluded.id}`])
    : undefined;

  const solutionNodes = shortestPathVia(
    graph,
    `player:${from.id}`,
    `player:${to.id}`,
    via ? `player:${via.id}` : undefined,
    blocked
  );

  // In moves (graph edges), matching how the player's moves are counted.
  const solutionDistance = solutionNodes
    ? solutionNodes.length - 1
    : null;

  return {
    origin: from.name,
    target: to.name,
    originId: from.id,
    targetId: to.id,
    via: via?.name ?? null,
    viaId: via?.id ?? null,
    excludedPlayer: excluded?.name ?? null,
    excludedId: excluded?.id ?? null,
    notLeagues,
    solutionDistance,
    solutionPath: solutionNodes
      ? pathToLabels(solutionNodes)
      : null,
    solvable: solutionNodes !== null,
  };
}

// Returns the same graph a given mode plays on, so the hint endpoint searches
// the exact graph the puzzle was built from.
export function getGraphForMode(
  mode: string,
  notLeagues: string[] = []
): Graph {
  if (mode === "daily") {
    return premierLeagueGraph();
  }
  if (mode === "challenge") {
    return getChallengeGraph(sanitizeLeagues(notLeagues));
  }
  return fullGraph();
}

// Distance (in moves/edges) from the target to every node, from a single BFS
// *from the target* on the mode's graph. Backs the per-move colour feedback
// (item 4): colouring any move is then an O(1) lookup, not a fresh traversal.
// Cached per mode + target + constraints and bounded like the graph caches, so
// the BFS runs at most once per puzzle. Uses the same graph as the hint
// endpoint (getGraphForMode), so colours and hints always agree.
const targetDistanceCache = new Map<
  string,
  Map<string, number>
>();

export function getTargetDistances(
  mode: string,
  targetKey: string,
  notLeagues: string[] = [],
  notPlayer?: string
): Map<string, number> {
  const leagues =
    mode === "challenge" ? sanitizeLeagues(notLeagues) : [];
  const key = `${mode}|${targetKey}|${[...leagues]
    .sort()
    .join(",")}|${notPlayer ?? ""}`;

  let distances = targetDistanceCache.get(key);
  if (!distances) {
    const graph = getGraphForMode(mode, leagues);
    const blocked = notPlayer
      ? new Set([`player:${notPlayer}`])
      : undefined;
    distances = bfsFrom(
      graph,
      targetKey,
      undefined,
      blocked
    ).distance;
    if (targetDistanceCache.size >= MAX_CACHED_GRAPHS) {
      const oldest = targetDistanceCache
        .keys()
        .next().value;
      if (oldest !== undefined) {
        targetDistanceCache.delete(oldest);
      }
    }
    targetDistanceCache.set(key, distances);
  }
  return distances;
}

export type PuzzleMode = "daily" | "expert" | "practice";

export async function getPuzzle(mode: PuzzleMode = "daily") {
  switch (mode) {
    case "practice": {
      return generatePracticePuzzle();
    }

    case "expert": {
      return generateExpertPuzzle();
    }

    case "daily":
    default: {
      return generateDailyPuzzle();
    }
  }
}
