import {
  buildGraph,
  bfsFrom,
  reconstructPath,
  shortestPathVia,
  pathToLabels,
  Graph,
} from "./graph";
import {
  getPlayerById,
  getCompetitions,
  getProminentPlayerNames,
} from "./db";
import {
  OBSCURITY_MIN_SEASONS,
  DAILY_MIN_TOP_FLIGHT_SEASONS,
} from "./prominence";

// Expert mode uses every competition in the dataset; the daily puzzle is
// restricted to the Premier League (competition "GB1").
const fullGraph = buildGraph();
const premierLeagueGraph = buildGraph({ competition: "GB1" });

const EXPERT_DISTANCE = 6;
const PRACTICE_DISTANCE = 2;

// Generated puzzles never go below this many jumps. A 1-jump puzzle is two
// players who shared a club (e.g. Tonali and Donnarumma at Milan), which is
// trivial; 2+ jumps forces a link through an intermediate player.
const MIN_JUMPS = 2;

// Prominence gating: the set of player nodes with at least `minSeasons`
// top-flight seasons. Memoised per threshold (it's a GROUP BY over every
// appearance, so we don't want to repeat it on each Practice generation).
const prominentNamesCache = new Map<number, Set<string>>();
function prominentPlayerNodes(minSeasons: number): Set<string> {
  let names = prominentNamesCache.get(minSeasons);
  if (!names) {
    names = getProminentPlayerNames(minSeasons);
    prominentNamesCache.set(minSeasons, names);
  }
  return new Set(
    Array.from(names, (name) => `player:${name}`)
  );
}

// Daily uses only reasonably recognisable players (prominence >= 3) so it stays
// gettable.
const dailyAllowedPlayers = prominentPlayerNodes(
  DAILY_MIN_TOP_FLIGHT_SEASONS
);

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

// Picks an origin and a target that are a genuine shortest distance apart, then
// reports that shortest path. `targetJumps` is the desired difficulty in jumps
// (player-to-player hops); if no player sits exactly that far away we fall back
// to the farthest reachable player within that bound. solutionDistance is in
// moves (selections / graph edges), matching how the player's moves are counted.
function generatePuzzle(
  graph: Graph,
  targetJumps: number,
  rng: () => number,
  allowed?: Set<string>
) {
  const players = Array.from(graph.keys()).filter(
    (node) =>
      node.startsWith("player:") &&
      (!allowed || allowed.has(node))
  );

  while (true) {
    const startNode =
      players[Math.floor(rng() * players.length)];

    const { distance, parent } = bfsFrom(
      graph,
      startNode,
      targetJumps * 2
    );

    // Bucket reachable players by their shortest distance in jumps.
    const byJumps = new Map<number, string[]>();
    for (const [node, edges] of distance) {
      if (
        edges === 0 ||
        edges % 2 !== 0 ||
        !node.startsWith("player:") ||
        (allowed && !allowed.has(node))
      ) {
        continue;
      }
      const jumps = edges / 2;
      const bucket = byJumps.get(jumps) ?? [];
      bucket.push(node);
      byJumps.set(jumps, bucket);
    }

    // Prefer the requested difficulty; otherwise the closest available down to
    // the floor. Never go below MIN_JUMPS — retry with a new origin instead, so
    // we never serve a trivial same-club puzzle.
    let jumps = 0;
    for (let j = targetJumps; j >= MIN_JUMPS; j--) {
      if (byJumps.has(j)) {
        jumps = j;
        break;
      }
    }

    if (jumps === 0) continue; // nothing at/above the floor here, try another

    const bucket = byJumps.get(jumps)!;
    const target =
      bucket[Math.floor(rng() * bucket.length)];

    const path = reconstructPath(parent, startNode, target);

    return {
      origin: startNode.replace("player:", ""),
      target: target.replace("player:", ""),
      solutionDistance: path.length - 1,
      solutionPath: pathToLabels(path),
    };
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
  if (noFilter) return fullGraph;

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

  return generatePuzzle(
    graph,
    PRACTICE_DISTANCE,
    Math.random,
    allowed
  );
}

function generateDailyPuzzle() {
  const seed = getDailySeed();
  const rng = seededRandom(seed);

  // The daily difficulty (in jumps) is the same for everyone on a given day.
  const span = DAILY_MAX_DISTANCE - DAILY_MIN_DISTANCE + 1;
  const targetJumps =
    DAILY_MIN_DISTANCE + Math.floor(rng() * span);

  return {
    ...generatePuzzle(
      premierLeagueGraph,
      targetJumps,
      rng,
      dailyAllowedPlayers
    ),
    seed,
  };
}

function generateExpertPuzzle() {
  const seed = getDailySeed();
  return {
    ...generatePuzzle(
      fullGraph,
      EXPERT_DISTANCE,
      seededRandom(seed)
    ),
    seed,
  };
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
    return fullGraph;
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
    ? new Set([`player:${excluded.name}`])
    : undefined;

  const solutionNodes = shortestPathVia(
    graph,
    `player:${from.name}`,
    `player:${to.name}`,
    via ? `player:${via.name}` : undefined,
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
    return premierLeagueGraph;
  }
  if (mode === "challenge") {
    return getChallengeGraph(sanitizeLeagues(notLeagues));
  }
  return fullGraph;
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
