// Splices generated candidates into database/daily-puzzles.json from a given
// puzzle number onward, leaving earlier (played) puzzles untouched. Run after
// scripts/generate-daily-candidates.ts, then validate with validate-dailies.ts.
//   npx tsx scripts/restock-dailies.ts <candidates.json> <fromNumber> [total]
import { readFileSync, writeFileSync } from "fs";

const [pool, fromArg, totalArg] = process.argv.slice(2);
if (!pool || !fromArg) {
  throw new Error(
    "Usage: tsx scripts/restock-dailies.ts <candidates.json> <fromNumber> [total]"
  );
}

const from = Number(fromArg);
const OUT = "database/daily-puzzles.json";
const existing = JSON.parse(readFileSync(OUT, "utf8"));
const total = Number(totalArg ?? existing.puzzles.length);
const candidates = JSON.parse(readFileSync(pool, "utf8"));

const keep = existing.puzzles.slice(0, from - 1);
const need = total - keep.length;
if (candidates.length < need) {
  throw new Error(
    `need ${need} candidates, pool has ${candidates.length}`
  );
}

const puzzles = [...keep, ...candidates.slice(0, need)];
writeFileSync(
  OUT,
  JSON.stringify(
    { ...existing, count: puzzles.length, puzzles },
    null,
    2
  )
);
console.log(
  `kept #1-${keep.length}, restocked #${from}-${puzzles.length} from ${pool}`
);
