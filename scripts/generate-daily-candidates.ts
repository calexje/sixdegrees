// Generates a pool of Daily puzzle candidates for manual curation. Daily BFS is
// cheap, so this runs in seconds. Output is a JSON array of {origin, target,
// solutionDistance, solutionPath, ids}, deduped by target so the curator sees a
// varied set. Run from the project root:
//   npx tsx scripts/generate-daily-candidates.ts <out.json> [count]
import { writeFileSync } from "fs";
import { generateDailyPuzzleForSeed } from "../lib/puzzle";

const out = process.argv[2];
const count = Number(process.argv[3] ?? 1000);

if (!out) {
  throw new Error(
    "Usage: tsx scripts/generate-daily-candidates.ts <out.json> [count]"
  );
}

const refYear = new Date().getUTCFullYear();
const seenTargets = new Set<string>();
const candidates: unknown[] = [];

for (let i = 0; i < count; i++) {
  const p = generateDailyPuzzleForSeed(`cand-${i}`, refYear);
  // One puzzle per distinct target keeps the curator's list varied.
  if (seenTargets.has(p.targetId)) continue;
  seenTargets.add(p.targetId);
  candidates.push({
    originId: p.originId,
    origin: p.origin,
    targetId: p.targetId,
    target: p.target,
    solutionDistance: p.solutionDistance,
    solutionPath: p.solutionPath,
  });
}

writeFileSync(out, JSON.stringify(candidates, null, 2));
console.log(
  `wrote ${candidates.length} unique-target candidates (from ${count} seeds) to ${out}`
);
