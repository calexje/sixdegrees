// Builds the 1-5 obscurity rank for every player: fame does the ranking,
// regularity only caps it. Design, rationale and known caveats in
// docs/roadmap.md.
//
// Run from the PROJECT ROOT, after import.ts:
//   npx tsx scripts/build-obscurity.ts          report only
//   npx tsx scripts/build-obscurity.ts --write  build the player_obscurity table
import Database from "better-sqlite3";
import path from "path";

// EFD1 is the pre-1992 English First Division.
const TOP_FLIGHT = ["GB1", "EFD1", "ES1", "IT1", "L1", "FR1"];

// The population the bands are taken over; changing it invalidates them.
const QUALIFY_MIN_TOP_FLIGHT_SEASONS = 3;

// A denominator, not a threshold: each season contributes min(1, mins/this),
// so a near-miss counts as a near-miss rather than a zero.
const FULL_SEASON_MINUTES = 1800;

// Regularity is a filter, not a ranking dimension - almost every real player is
// a regular 80-100% of the time, so ranking on it amplifies noise. It only
// pulls down someone who was demonstrably not playing.
const REGULARITY_CAPS: { min: number; cap: number }[] = [
  { min: 0.75, cap: 1 },
  { min: 0.5, cap: 3 },
  { min: 0, cap: 4 },
];

// Cumulative share of the qualified population per rank. Geometric, not even
// fifths: recognisability has a long tail. Applied once, to the percentile.
const BANDS: { rank: number; topShare: number }[] = [
  { rank: 1, topShare: 0.03 },
  { rank: 2, topShare: 0.08 },
  { rank: 3, topShare: 0.2 },
  { rank: 4, topShare: 0.4 },
];

const DB_PATH = path.join(
  process.cwd(),
  "database",
  "football.db"
);

type PlayerRow = {
  player_id: string;
  name: string;
  editions: number;
  top_flight_seasons: number;
  regular_seasons: number;
  mid_season: number;
  position: string | null;
};

type Ranked = PlayerRow & {
  era: string;
  positionGroup: string;
  famePct: number;
  minutesPct: number;
  combinedPct: number;
  rank: number;
};

// Coarse on purpose: the bias is generational, not annual.
function eraOf(midSeason: number): string {
  if (midSeason < 2000) return "1990s";
  if (midSeason < 2010) return "2000s";
  if (midSeason < 2020) return "2010s";
  return "2020s";
}

// Only keepers are split out; outfield positions differ from each other far
// less than any of them differs from a keeper.
function positionGroupOf(position: string | null): string {
  return position === "Goalkeeper" ? "Goalkeeper" : "Outfield";
}

function loadQualified(db: Database.Database): PlayerRow[] {
  const placeholders = TOP_FLIGHT.map(() => "?").join(", ");

  return db
    .prepare(
      `
      WITH top_flight AS (
        SELECT player_id, COUNT(DISTINCT season) AS seasons
        FROM appearances
        WHERE competition IN (${placeholders})
        GROUP BY player_id
        HAVING COUNT(DISTINCT season) >= ?
      ),
      -- Minutes are per club-season, so a player who moved mid-season has two
      -- rows for that year; summing before the threshold counts the season once
      -- and credits the full workload.
      season_minutes AS (
        SELECT player_id, season, SUM(COALESCE(minutes, 0)) AS mins
        FROM appearances
        GROUP BY player_id, season
      ),
      -- Season-equivalents over seasons present: "when this player was on a
      -- squad, how much of the time was he actually playing?" Independent of
      -- career length by construction.
      regular AS (
        SELECT player_id,
               SUM(MIN(1.0, mins * 1.0 / ?)) / COUNT(*) AS regularity
        FROM season_minutes
        GROUP BY player_id
      ),
      -- Career midpoint, so a player is placed in the era they actually played
      -- in rather than the one they happened to debut or retire in.
      era AS (
        SELECT player_id,
               CAST(AVG(CAST(season AS REAL)) AS INTEGER) AS mid_season,
               MAX(player_name) AS name
        FROM appearances
        GROUP BY player_id
      ),
      -- Modal position: players are listed per club-season and occasionally get
      -- reclassified, so the most frequent label is the stable one.
      position AS (
        SELECT player_id, position FROM (
          SELECT player_id, position,
                 ROW_NUMBER() OVER (
                   PARTITION BY player_id ORDER BY COUNT(*) DESC
                 ) AS rn
          FROM appearances
          WHERE position IS NOT NULL AND position != ''
          GROUP BY player_id, position
        ) WHERE rn = 1
      )
      SELECT t.player_id,
             era.name,
             COALESCE(f.editions, 0) AS editions,
             t.seasons AS top_flight_seasons,
             COALESCE(r.regularity, 0) AS regular_seasons,
             era.mid_season,
             p.position
      FROM top_flight t
      JOIN era ON era.player_id = t.player_id
      LEFT JOIN player_fame f ON f.player_id = t.player_id
      LEFT JOIN regular r ON r.player_id = t.player_id
      LEFT JOIN position p ON p.player_id = t.player_id
      `
    )
    .all(
      ...TOP_FLIGHT,
      QUALIFY_MIN_TOP_FLIGHT_SEASONS,
      FULL_SEASON_MINUTES
    ) as PlayerRow[];
}

// Percentile within a cohort, 0 = best. Ties share their group's best.
function percentileWithinCohort(
  members: { id: string; score: number }[]
): Map<string, number> {
  const sorted = [...members].sort((a, b) => b.score - a.score);
  const percentiles = new Map<string, number>();

  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (
      j + 1 < sorted.length &&
      sorted[j + 1].score === sorted[i].score
    ) {
      j++;
    }

    for (let k = i; k <= j; k++) {
      percentiles.set(sorted[k].id, i / sorted.length);
    }

    i = j + 1;
  }

  return percentiles;
}

// Bands in one pass, so each rank's share is what BANDS says it is.
function bandByPercentile(
  members: { id: string; percentile: number }[]
): Map<string, number> {
  const sorted = [...members].sort(
    (a, b) => a.percentile - b.percentile
  );
  const ranks = new Map<string, number>();

  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (
      j + 1 < sorted.length &&
      sorted[j + 1].percentile === sorted[i].percentile
    ) {
      j++;
    }

    const share = i / sorted.length;
    const band = BANDS.find((b) => share < b.topShare);
    const rank = band ? band.rank : 5;

    for (let k = i; k <= j; k++) {
      ranks.set(sorted[k].id, rank);
    }

    i = j + 1;
  }

  return ranks;
}

function rankAll(rows: PlayerRow[]): Ranked[] {
  const byEra = new Map<string, { id: string; score: number }[]>();
  const byPosition = new Map<string, { id: string; score: number }[]>();

  for (const row of rows) {
    const era = eraOf(row.mid_season);
    const group = positionGroupOf(row.position);

    if (!byEra.has(era)) byEra.set(era, []);
    if (!byPosition.has(group)) byPosition.set(group, []);

    byEra.get(era)!.push({
      id: row.player_id,
      score: row.editions,
    });
    byPosition.get(group)!.push({
      id: row.player_id,
      score: row.regular_seasons,
    });
  }

  const famePct = new Map<string, number>();
  for (const members of byEra.values()) {
    for (const [id, pct] of percentileWithinCohort(members)) {
      famePct.set(id, pct);
    }
  }

  const minutesPct = new Map<string, number>();
  for (const members of byPosition.values()) {
    for (const [id, pct] of percentileWithinCohort(members)) {
      minutesPct.set(id, pct);
    }
  }

  // Fame does the ranking; regularity only caps it.
  const fameBands = bandByPercentile(
    rows.map((row) => ({
      id: row.player_id,
      percentile: famePct.get(row.player_id) ?? 1,
    }))
  );

  return rows.map((row) => {
    const fameBand = fameBands.get(row.player_id) ?? 5;
    const cap =
      REGULARITY_CAPS.find(
        (c) => row.regular_seasons >= c.min
      )?.cap ?? 5;

    return {
      ...row,
      era: eraOf(row.mid_season),
      positionGroup: positionGroupOf(row.position),
      famePct: famePct.get(row.player_id) ?? 1,
      minutesPct: minutesPct.get(row.player_id) ?? 1,
      combinedPct: famePct.get(row.player_id) ?? 1,
      rank: Math.max(fameBand, cap),
    };
  });
}

function main() {
  const write = process.argv.includes("--write");
  const db = new Database(DB_PATH);

  const total = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT player_id) AS n FROM appearances`
      )
      .get() as { n: number }
  ).n;

  const rows = loadQualified(db);
  console.log(
    `${total} players, ${rows.length} qualified (>=${QUALIFY_MIN_TOP_FLIGHT_SEASONS} top-flight seasons)`
  );

  const ranked = rankAll(rows);

  const counts = new Map<number, number>();
  for (const row of ranked) {
    counts.set(row.rank, (counts.get(row.rank) ?? 0) + 1);
  }

  console.log("\nrank  qualified players");
  for (let rank = 1; rank <= 5; rank++) {
    console.log(
      `  ${rank}   ${counts.get(rank) ?? 0}`
    );
  }
  console.log(
    `  5   +${total - rows.length} unqualified`
  );

  // Anchors supplied as ground truth, checked on every rebuild: the thresholds
  // are calibrated against these and drift in the data should be visible here
  // before it reaches a puzzle.
  const anchors: [string, string, number | null][] = [
    ["3111", "Zinédine Zidane", 1],
    ["3207", "Thierry Henry", 1],
    ["18944", "Gerard Piqué", 1],
    ["3110", "Alan Shearer", null],
    ["3202", "Kolo Touré", 3],
    ["3188", "Sylvain Wiltord", 3],
    ["3173", "Boudewijn Zenden", 3],
    ["43705", "Matt Le Tissier", null],
    ["14555", "Scott Carson", 5],
    ["7259", "Stéphane Dalmat", 5],
    ["193081", "Ryan Gauld", 5],
  ];

  const byId = new Map(ranked.map((row) => [row.player_id, row]));

  console.log(
    "\nexp  player                eds   era    seasons  fame%  mins%   RANK"
  );
  for (const [id, name, expected] of anchors) {
    const row = byId.get(id);
    if (!row) {
      console.log(
        `  ${expected ?? "-"}  ${name.padEnd(20)} unqualified -> rank 5`
      );
      continue;
    }
    const flag =
      expected !== null && row.rank !== expected
        ? `  <-- expected ${expected}`
        : "";
    console.log(
      `  ${expected ?? "-"}  ${name.padEnd(20)} ${String(row.editions).padStart(4)} ${row.era.padStart(6)} ${row.regular_seasons.toFixed(1).padStart(8)} ${(row.famePct * 100).toFixed(1).padStart(6)} ${(row.minutesPct * 100).toFixed(1).padStart(6)} ${String(row.rank).padStart(6)}${flag}`
    );
  }

  if (!write) {
    console.log(
      "\nReport only. Re-run with --write to build the player_obscurity table."
    );
    db.close();
    return;
  }

  db.exec(`
    DROP TABLE IF EXISTS player_obscurity;

    CREATE TABLE player_obscurity (
        player_id TEXT PRIMARY KEY,
        rank INTEGER NOT NULL,
        fame_pct REAL NOT NULL,
        minutes_pct REAL NOT NULL,
        editions INTEGER NOT NULL,
        season_equivalents REAL NOT NULL,
        era TEXT NOT NULL,
        position_group TEXT NOT NULL
    );
  `);

  const insert = db.prepare(`
    INSERT INTO player_obscurity
    (player_id, rank, fame_pct, minutes_pct, editions,
     season_equivalents, era, position_group)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction((all: Ranked[]) => {
    for (const row of all) {
      insert.run(
        row.player_id,
        row.rank,
        row.famePct,
        row.minutesPct,
        row.editions,
        row.regular_seasons,
        row.era,
        row.positionGroup
      );
    }
  });

  insertAll(ranked);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_obscurity_rank ON player_obscurity(rank)`
  );

  console.log(
    `\nWrote ${ranked.length} rows to player_obscurity. Players absent from the table are rank 5.`
  );

  db.close();
}

main();
