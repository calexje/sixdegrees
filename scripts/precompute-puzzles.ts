// Precomputes a horizon of Expert puzzles so the live site never pays the
// (slow) BFS search on a cold start. Expert puzzles are deterministic per date
// seed, so generating them ahead of time and committing the result is safe.
//
// Run from the PROJECT ROOT (lib/db resolves the database from process.cwd()):
//   npx tsx scripts/precompute-puzzles.ts [days]
//
// The import script calls this automatically after rebuilding the database.
// Default horizon is 365 days, comfortably past the twice-a-year reimport.
import { writeFileSync } from "fs";
import path from "path";
import { generateExpertPuzzleForSeed } from "../lib/puzzle";

const DAYS = Number(process.argv[2] ?? 365);

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function main() {
  if (!Number.isFinite(DAYS) || DAYS < 1) {
    throw new Error(`Invalid day count: ${process.argv[2]}`);
  }

  const start = new Date();
  const startSeed = isoDate(start);
  const puzzles: Record<
    string,
    ReturnType<typeof generateExpertPuzzleForSeed>
  > = {};

  console.log(
    `Precomputing ${DAYS} Expert puzzles from ${startSeed}...`
  );
  const began = Date.now();

  for (let i = 0; i < DAYS; i++) {
    // Step the UTC calendar date forward so seeds match getDailySeed().
    const d = new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + i
      )
    );
    const seed = isoDate(d);
    puzzles[seed] = generateExpertPuzzleForSeed(seed);

    if ((i + 1) % 25 === 0 || i + 1 === DAYS) {
      const elapsed = ((Date.now() - began) / 1000).toFixed(0);
      console.log(`  ${i + 1}/${DAYS} (${elapsed}s)`);
    }
  }

  const out = path.join(
    process.cwd(),
    "database",
    "expert-puzzles.json"
  );
  writeFileSync(
    out,
    JSON.stringify({
      version: 1,
      generatedFrom: startSeed,
      days: DAYS,
      puzzles,
    }) + "\n"
  );
  console.log(
    `Wrote ${Object.keys(puzzles).length} puzzles to ${out}`
  );
}

main();
