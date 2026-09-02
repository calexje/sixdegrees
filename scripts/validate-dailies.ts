// Revalidates the hand-curated Daily puzzles against the current graph.
//
// Why this has to exist: database/daily-puzzles.json stores a solutionDistance
// and solutionPath alongside each hand-picked pair, and the board treats that
// stored number as the truth. It sets the move budget (optimalMoves =
// solutionDistance - 1, budget = optimal + MOVE_SLACK), the end-of-game rating,
// and the "Show optimal route" reveal. A re-import that adds a season adds
// edges, and an added edge can only ever make a route shorter — so a puzzle
// curated at 6 moves may now be solvable in 4. The player then beats the
// "optimal" the game claims, against the invariant in docs/graph-consistency.md,
// and the budget is computed from a distance that no longer exists.
//
// The Expert set needs no equivalent: precompute-puzzles.ts regenerates it
// wholesale on every import, so it is self-healing. The curated Dailies are
// hand-vetted and committed, so they can only be corrected deliberately.
//
// Run from the PROJECT ROOT (lib/db resolves the database from process.cwd()):
//   npx tsx scripts/validate-dailies.ts          report only
//   npx tsx scripts/validate-dailies.ts --fix    rewrite stale solutions
//
// --fix recomputes solutionDistance and solutionPath only. The curated origin
// and target are never touched: which players a puzzle connects is the editorial
// decision, and only its solution is derived data.
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { getGraphForMode } from "../lib/puzzle";
import {
  findShortestPath,
  nodeLabel,
  pathToLabels,
  playerNode,
} from "../lib/graph";
import type { Graph, NodeId } from "../lib/graph";

type CuratedPuzzle = {
  originId: string;
  origin: string;
  targetId: string;
  target: string;
  solutionDistance: number;
  solutionPath: string[];
};

type CuratedFile = {
  version: number;
  count: number;
  puzzles: CuratedPuzzle[];
};

type Verdict =
  | "ok"
  | "path-invalid"
  | "shorter"
  | "longer"
  | "unreachable"
  | "missing-endpoint";

type Result = {
  number: number;
  puzzle: CuratedPuzzle;
  verdict: Verdict;
  actualDistance: number | null;
  actualPath: string[] | null;
  detail: string;
};

// Ordered worst-first. Anything at or above "longer" makes the board lie about
// its own solution; "path-invalid" only affects the optimal-route reveal.
const BREAKING: Verdict[] = [
  "missing-endpoint",
  "unreachable",
  "shorter",
  "longer",
];

// Labels are not unique — distinct players share a name (the "17 Fernandos"
// the graph was re-keyed on ids to fix), so one label can map to several nodes.
// Walking the stored route therefore carries the whole candidate set forward at
// each step and asks only whether *some* consistent assignment survives.
function storedPathExists(
  labels: string[],
  graph: Graph,
  labelIndex: Map<string, NodeId[]>
): boolean {
  let frontier = labelIndex.get(labels[0]) ?? [];
  if (frontier.length === 0) return false;

  for (let i = 1; i < labels.length; i++) {
    const candidates = labelIndex.get(labels[i]) ?? [];

    const next = candidates.filter((candidate) =>
      frontier.some((node) => graph.get(node)?.has(candidate))
    );

    if (next.length === 0) return false;

    frontier = next;
  }

  return true;
}

function buildLabelIndex(graph: Graph): Map<string, NodeId[]> {
  const index = new Map<string, NodeId[]>();

  for (const node of graph.keys()) {
    const label = nodeLabel(node);
    const list = index.get(label) ?? [];
    list.push(node);
    index.set(label, list);
  }

  return index;
}

function check(
  puzzle: CuratedPuzzle,
  number: number,
  graph: Graph,
  labelIndex: Map<string, NodeId[]>
): Result {
  const origin = playerNode(puzzle.originId);
  const target = playerNode(puzzle.targetId);

  const base = { number, puzzle };

  // A curated endpoint can disappear entirely: a re-pull that drops a player's
  // only recorded season removes the node, and the puzzle is then unplayable
  // rather than merely mis-scored.
  const missing = [
    !graph.has(origin) ? `origin ${puzzle.origin}` : null,
    !graph.has(target) ? `target ${puzzle.target}` : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    return {
      ...base,
      verdict: "missing-endpoint",
      actualDistance: null,
      actualPath: null,
      detail: `not in graph: ${missing.join(", ")}`,
    };
  }

  const found = findShortestPath(graph, origin, target);

  if (!found) {
    return {
      ...base,
      verdict: "unreachable",
      actualDistance: null,
      actualPath: null,
      detail: "no route between the endpoints",
    };
  }

  const actualDistance = found.length - 1;
  const actualPath = pathToLabels(found);

  if (actualDistance < puzzle.solutionDistance) {
    return {
      ...base,
      verdict: "shorter",
      actualDistance,
      actualPath,
      detail: `beatable: stored ${puzzle.solutionDistance}, actual ${actualDistance}`,
    };
  }

  if (actualDistance > puzzle.solutionDistance) {
    return {
      ...base,
      verdict: "longer",
      actualDistance,
      actualPath,
      detail: `unachievable: stored ${puzzle.solutionDistance}, actual ${actualDistance}`,
    };
  }

  // The distance is right, so the budget and rating are right. What remains is
  // whether the *stored* route still exists, because that is what "Show optimal
  // route" displays. Comparing it to the freshly computed path would be
  // useless: a puzzle typically has many equally short routes and BFS returns
  // whichever graph iteration order reaches the target first, so a mismatch
  // says nothing about validity.
  if (!storedPathExists(puzzle.solutionPath, graph, labelIndex)) {
    return {
      ...base,
      verdict: "path-invalid",
      actualDistance,
      actualPath,
      detail: "stored route no longer exists in the graph",
    };
  }

  return {
    ...base,
    verdict: "ok",
    actualDistance,
    actualPath,
    detail: "",
  };
}

function main() {
  const fix = process.argv.includes("--fix");

  const file = path.join(
    process.cwd(),
    "database",
    "daily-puzzles.json"
  );

  const data = JSON.parse(
    readFileSync(file, "utf8")
  ) as CuratedFile;

  console.log(
    `Validating ${data.puzzles.length} curated Dailies against the live graph...`
  );

  // The same accessor the board, the hint endpoint and the colour feedback all
  // use. Building a graph here instead would risk validating against something
  // the game never sees, which is precisely how the invariant broke before.
  const graph = getGraphForMode("daily", []);

  const labelIndex = buildLabelIndex(graph);

  const results = data.puzzles.map((puzzle, i) =>
    check(puzzle, i + 1, graph, labelIndex)
  );

  const byVerdict = new Map<Verdict, Result[]>();
  for (const result of results) {
    const list = byVerdict.get(result.verdict) ?? [];
    list.push(result);
    byVerdict.set(result.verdict, list);
  }

  console.log("");
  for (const verdict of [
    "ok",
    "path-invalid",
    ...BREAKING,
  ] as Verdict[]) {
    const list = byVerdict.get(verdict);
    if (list && list.length > 0) {
      console.log(
        `  ${verdict.padEnd(17)} ${list.length}`
      );
    }
  }

  const problems = results.filter(
    (result) => result.verdict !== "ok"
  );

  if (problems.length > 0) {
    console.log("");
    for (const problem of problems) {
      console.log(
        `  #${String(problem.number).padStart(3)} ${problem.puzzle.origin} -> ${problem.puzzle.target}`
      );
      console.log(`       ${problem.verdict}: ${problem.detail}`);

      if (problem.actualPath) {
        console.log(
          `       stored: ${problem.puzzle.solutionPath.join(" -> ")}`
        );
        console.log(
          `       actual: ${problem.actualPath.join(" -> ")}`
        );
      }
    }
  }

  const breaking = problems.filter((problem) =>
    BREAKING.includes(problem.verdict)
  );

  if (!fix) {
    console.log("");

    if (problems.length === 0) {
      console.log("All curated Dailies agree with the graph.");
      return;
    }

    console.log(
      `${problems.length} need attention (${breaking.length} breaking). Re-run with --fix to rewrite their solutions.`
    );
    console.log(
      "Puzzles at or below the current Daily number have already been played; those above it are the ones that must be right."
    );

    // Non-zero exit so a broken invariant can fail a script or a CI step
    // rather than scrolling past in a log.
    if (breaking.length > 0) {
      process.exitCode = 1;
    }

    return;
  }

  const fixable = problems.filter(
    (problem) => problem.actualPath && problem.actualDistance !== null
  );

  for (const problem of fixable) {
    const puzzle = data.puzzles[problem.number - 1];
    puzzle.solutionDistance = problem.actualDistance!;
    puzzle.solutionPath = problem.actualPath!;
  }

  const unfixable = problems.filter(
    (problem) => !problem.actualPath
  );

  // Compact JSON with a trailing newline, matching how the file is written by
  // the generator, so --fix produces a minimal diff.
  writeFileSync(
    file,
    JSON.stringify({
      version: data.version,
      count: data.puzzles.length,
      puzzles: data.puzzles,
    }) + "\n"
  );

  console.log("");
  console.log(
    `Rewrote ${fixable.length} solution${fixable.length === 1 ? "" : "s"} in ${file}`
  );

  if (unfixable.length > 0) {
    console.log(
      `${unfixable.length} cannot be fixed automatically (no route exists) and need a new curated pair:`
    );
    for (const problem of unfixable) {
      console.log(
        `  #${problem.number} ${problem.puzzle.origin} -> ${problem.puzzle.target} (${problem.verdict})`
      );
    }
    process.exitCode = 1;
  }
}

main();
