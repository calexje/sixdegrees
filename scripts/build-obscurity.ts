// Builds the 1-5 obscurity rank for every player, from two independent signals.
//
// The rank this replaces was distinct seasons in the Big-5 top flights, which
// measures how long a career lasted rather than who has heard of the player.
// It put Scott Carson (13 top-flight seasons) and Stéphane Dalmat (14, the same
// as Alan Shearer) in the top bucket, and docs/roadmap.md concedes that Mikel
// Aranburu scores near Gerrard.
//
// Two bars, and the WORSE one governs. Each catches a dud the other cannot:
//
//   fame    - Wikipedia language editions (scripts/fetch-fame.ts). Catches the
//             long-but-unknown: Gerrard 96 vs Aranburu 18, Shearer 75 vs
//             Dalmat 17. Career length cannot separate those pairs.
//   minutes - the SHARE of a career spent as a regular, not the count of such
//             seasons. Catches the famous-by-association: a bench player at a
//             big club accumulates seasons and reflected glory without ever
//             being the player anyone watched.
//
//             The count is a longevity measure wearing a disguise, and using it
//             put Amedeo Carboni (31 editions, 16 seasons) above Neymar (155
//             editions, 10 seasons) — because the weaker signal governs, a long
//             ordinary career vetoed a short brilliant one. A rate has no such
//             bias: Neymar 1.00, Giggs 0.95, Carboni 0.94, and Scott Carson
//             0.60, which is the bench-time this signal exists to find.
//
// Both are percentiles within a COHORT rather than absolute thresholds, because
// each signal has a structural bias that a fixed cutoff would bake in:
//
//   fame    - by era. Wikipedia grew after 2005 and active players attract
//             continuous editing, so Rashford (86) outranks Shearer (75) and
//             Saka (71) outranks Zola (52). Comparing a 1990s player against
//             today's is comparing coverage, not renown — and sinking retired
//             legends is the exact failure docs/roadmap.md rejected recency for.
//   minutes - by position. Goalkeepers are rarely substituted, so they cross a
//             "regular season" bar more often than outfielders (47.8% vs 41.9%
//             in a sample season). Left alone that promotes keepers as a class
//             and pushes puzzles toward goalkeeper-to-goalkeeper chains.
//
// Ranking every player together does not work: most of the 60,000 in the
// dataset are anonymous, so "top 15%" still reaches players nobody has heard of
// (Ryan Gauld and Stéphane Dalmat both land inside it). Everyone is therefore
// gated first, and only those who clear it are ranked; the rest are rank 5.
//
// Run from the PROJECT ROOT, after import.ts:
//   npx tsx scripts/build-obscurity.ts          report only
//   npx tsx scripts/build-obscurity.ts --write  build the player_obscurity table
import Database from "better-sqlite3";
import path from "path";

// Top flights whose seasons count toward qualification. EFD1 is the pre-1992
// English First Division — the same competition the Premier League replaced.
const TOP_FLIGHT = ["GB1", "EFD1", "ES1", "IT1", "L1", "FR1"];

// Qualification: enough top-flight seasons to have had a real career. This is
// the population the percentile bands are taken over, and the thresholds below
// were calibrated against it, so changing it invalidates them.
const QUALIFY_MIN_TOP_FLIGHT_SEASONS = 3;

// Minutes constituting a full season as a regular, across all competitions.
// Roughly twenty full matches.
//
// A DENOMINATOR, not a threshold. Counting seasons that cross a cutoff is
// knife-edged: Zenden played 1774, 1717 and 1657 minutes in three seasons and
// scored nothing for any of them, dropping a decade at Barcelona, Chelsea and
// Liverpool to the bottom rank. Each season instead contributes
// min(1, minutes / this), so a near-miss is worth 0.98 rather than 0, while a
// bench player still accrues almost nothing and pure longevity — the bug this
// signal exists to catch — earns no credit.
const FULL_SEASON_MINUTES = 1800;

// Cumulative share of the qualified population per rank: rank 1 is the top 3%,
// ranks 1-2 the top 8%, and so on. Geometric rather than even fifths, because
// recognisability has a long tail and even bands put anonymous players top.
//
// Applied ONCE, to the combined percentile. Banding each signal separately and
// taking the worse rank compounds — a player had to be top-3% on both, and the
// intersection is far smaller than either, so "top 3%" yielded 157 players
// instead of 436. Taking the worse PERCENTILE first and banding that keeps the
// same "weaker signal governs" rule while making band sizes mean what they say.
// Regularity caps. The minutes signal is a FILTER, not a second ranking
// dimension: nearly every real player is a regular 80-100% of the time, so
// percentile-ranking it amplifies noise — Henry at 0.9 landed 16 percentile
// points behind Zidane at 1.0 and lost two ranks for it. As a cap it does only
// the job it exists for: pull down someone who was demonstrably not playing,
// like Scott Carson at 0.60, and leave everyone else to be ranked on fame.
const REGULARITY_CAPS: { min: number; cap: number }[] = [
  { min: 0.75, cap: 1 },
  { min: 0.5, cap: 3 },
  { min: 0, cap: 4 },
];

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

// Era cohorts. Coarse on purpose: finer slices would compare a player against
// too few peers, and the bias being corrected is generational, not annual.
function eraOf(midSeason: number): string {
  if (midSeason < 2000) return "1990s";
  if (midSeason < 2010) return "2000s";
  if (midSeason < 2020) return "2010s";
  return "2020s";
}

// Only goalkeepers are split out. The measured bias is specific to them —
// outfield positions differ from each other far less than any of them differ
// from a keeper who plays every minute of every game.
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

// Percentile within a cohort, 0 = best. Ties share their group's best
// percentile: players level on a signal must not be separated by the arbitrary
// order the database returned them in.
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

// Bands the combined percentile in a single pass, so each rank's share of the
// population is what BANDS says it is. Ties are kept together for the same
// reason as above.
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
