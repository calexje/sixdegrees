import { it, expect } from "vitest";
import Database from "better-sqlite3";
import path from "path";
import { getPlayerIdsByMaxRank } from "../lib/db";
import { readFileSync } from "fs";
import { DAILY_ORIGIN_MAX_RANK, DAILY_TARGET_MAX_RANK} from "../lib/prominence";

const ids = [1, 2, 3, 4].map((r) => getPlayerIdsByMaxRank(r));

it("each ceiling is a superset of the last", () => {
  for (let i = 1; i < ids.length; i++) {
    for (const id of ids[i - 1]) expect(ids[i].has(id)).toBe(true);
    expect(ids[i].size).toBeGreaterThan(ids[i - 1].size);
  }
});

it("maxRank 5 is qualified players only, not everyone", () => {
  const db = new Database(
    path.join(process.cwd(), "database", "football.db"),
    { readonly: true }
  );
  const { n } = db
    .prepare("SELECT COUNT(DISTINCT player_id) AS n FROM appearances")
    .get() as { n: number };
  db.close();

  expect(getPlayerIdsByMaxRank(5).size).toBeLessThan(n);
});

// tests were implementd after puzzle #66, so puzzles before might not respect the rules.
const FIRST_GENERATED = 67;

it("every generated Daily respects the rank gate", () => {
  const originAllowed = getPlayerIdsByMaxRank(DAILY_ORIGIN_MAX_RANK);
  const targetAllowed = getPlayerIdsByMaxRank(DAILY_TARGET_MAX_RANK);
  const { puzzles } = JSON.parse(
    readFileSync("database/daily-puzzles.json", "utf8")
  );

  const generated = puzzles.slice(FIRST_GENERATED - 1);
  expect(generated.length).toBeGreaterThan(0);

  for (const p of generated) {
    expect(targetAllowed.has(p.targetId)).toBe(true);
    expect(originAllowed.has(p.originId)).toBe(true);
  }
});