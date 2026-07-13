// Requirement 4 check: the no-year (club-collapsed) board only changes how moves
// are entered, not the graph the optimal is solved on — so the next 15 Daily and
// Expert puzzles should be unchanged and non-trivial. This script proves that
// two ways, per puzzle:
//   1) Triviality — the optimal must be >= MIN_JUMPS (2) jumps.
//   2) Board-walkability — every step of the optimal path must be reachable on
//      the collapsed board, i.e. for each player -> club -> player triple the
//      collapsed teammates query (getClubTeammates) actually offers the next
//      player. This is the "no less" half of the graph-consistency invariant:
//      the fix that lets an era-relay pass back through the same club.
//
// Run: npx tsx scripts/test-noyear-puzzles.ts

import { readFileSync } from "fs";
import path from "path";
import { buildGraph, findShortestPath } from "../lib/graph";
import {
  generateDailyPuzzleForSeed,
  generateExpertPuzzleForSeed,
} from "../lib/puzzle";
import { getClubTeammates } from "../lib/db";

const MIN_JUMPS = 2;
const START = "2026-07-13";
const DAYS = 15;
const DAILY_EPOCH = Date.UTC(2026, 5, 30); // matches lib/puzzle

type Puzzle = {
  originId: string;
  origin: string;
  targetId: string;
  target: string;
  solutionDistance: number | null;
};

function readJson<T>(rel: string): T | null {
  try {
    return JSON.parse(
      readFileSync(path.join(process.cwd(), rel), "utf8")
    ) as T;
  } catch {
    return null;
  }
}

const curated =
  readJson<{ puzzles?: Puzzle[] }>("database/daily-puzzles.json")
    ?.puzzles ?? [];
const precomputedExpert =
  readJson<{ puzzles?: Record<string, Puzzle> }>(
    "database/expert-puzzles.json"
  )?.puzzles ?? {};

function dailyNumber(seed: string): number {
  const day = Date.parse(`${seed}T00:00:00Z`);
  return Math.floor((day - DAILY_EPOCH) / 86_400_000) + 1;
}

function dailyFor(seed: string): Puzzle {
  const num = dailyNumber(seed);
  return (
    curated[num - 1] ??
    generateDailyPuzzleForSeed(seed, Number(seed.slice(0, 4)))
  );
}

function expertFor(seed: string): Puzzle {
  return precomputedExpert[seed] ?? generateExpertPuzzleForSeed(seed);
}

console.log("Building full graph…");
const graph = buildGraph();

// Walk the true shortest path (on the same full graph the optimal uses) and
// confirm the collapsed board offers every step. Returns the walkable jump
// distance, or an error describing the first step the board can't reproduce.
function boardWalk(
  originId: string,
  targetId: string
): { jumps: number } | { error: string } {
  const p = findShortestPath(
    graph,
    `player:${originId}`,
    `player:${targetId}`
  );
  if (!p) return { error: "unreachable on full graph" };

  for (let i = 0; i + 2 < p.length; i += 2) {
    const prevId = p[i].slice("player:".length);
    const nextId = p[i + 2].slice("player:".length);
    // "clubseason:<clubId>:<season>"
    const clubId = p[i + 1].split(":")[1];
    const mates = getClubTeammates(prevId, clubId);
    if (!mates.some((m) => m.id === nextId)) {
      return {
        error: `board omits ${prevId} -> club ${clubId} -> ${nextId}`,
      };
    }
  }
  return { jumps: (p.length - 1) / 2 };
}

const startMs = Date.parse(`${START}T00:00:00Z`);
let failures = 0;

function report(label: string, seed: string, puz: Puzzle) {
  const dist = puz.solutionDistance;
  const jumps = dist !== null ? dist / 2 : null;
  const moves = dist !== null ? dist - 1 : null;
  const walk = boardWalk(puz.originId, puz.targetId);

  const flags: string[] = [];
  if (dist === null) flags.push("UNSOLVABLE");
  else if (jumps! < MIN_JUMPS) flags.push("TRIVIAL");
  if ("error" in walk) flags.push(`BOARD:${walk.error}`);
  else if (jumps !== null && walk.jumps !== jumps)
    flags.push(`DIST-MISMATCH board=${walk.jumps} stored=${jumps}`);

  const ok = flags.length === 0;
  if (!ok) failures++;

  console.log(
    `${ok ? "✅" : "❌"} ${label} ${seed}  ` +
      `${jumps ?? "?"} jumps / ${moves ?? "?"} moves  ` +
      `${puz.origin} → ${puz.target}` +
      (flags.length ? `  [${flags.join("; ")}]` : "")
  );
}

for (let i = 0; i < DAYS; i++) {
  const seed = new Date(startMs + i * 86_400_000)
    .toISOString()
    .slice(0, 10);
  report("DAILY ", seed, dailyFor(seed));
  report("EXPERT", seed, expertFor(seed));
}

console.log(
  failures === 0
    ? `\nAll ${DAYS * 2} puzzles: non-trivial and fully walkable on the collapsed board.`
    : `\n${failures} puzzle(s) flagged — see above.`
);
process.exit(failures === 0 ? 0 : 1);
