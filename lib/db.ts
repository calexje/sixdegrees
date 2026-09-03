import Database from "better-sqlite3";
import path from "path";

export type Appearance = {
  player_id: string;
  player_name: string;
  club_id: string;
  club_name: string;
  season: string;
  competition?: string;
};

export type PlayerRef = {
  id: string;
  name: string;
};

export type ClubSeasonRow = {
  clubId: string;
  club: string;
  season: string;
  competition: string;
};

const db = new Database(
  path.join(process.cwd(), "database", "football.db"),
  { readonly: true, fileMustExist: true }
);

// A specific player's club-seasons, by player id (not name).
export function getPlayerClubSeasons(
  playerId: string
): ClubSeasonRow[] {
  return db
    .prepare(`
      SELECT DISTINCT club_id AS clubId, club_name AS club, season, competition
      FROM appearances
      WHERE player_id = ?
      ORDER BY CAST(season AS REAL) DESC
    `)
    .all(playerId) as ClubSeasonRow[];
}

// The squad of a specific club-season, by club id (not name).
export function getClubSeasonPlayers(
  clubId: string,
  season: string
): PlayerRef[] {
  return db
    .prepare(`
      SELECT DISTINCT player_id AS id, player_name AS name
      FROM appearances
      WHERE club_id = ?
      AND season = ?
      ORDER BY player_name
    `)
    .all(clubId, season) as PlayerRef[];
}

export type AppearanceFilter = {
  competition?: string;
  includeLeagues?: string[];
  excludeLeagues?: string[];
  seasonFrom?: number;
  seasonTo?: number;
};

export function getAllAppearances(
  opts: AppearanceFilter = {}
): Appearance[] {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (opts.competition) {
    clauses.push("competition = ?");
    params.push(opts.competition);
  }
  if (opts.includeLeagues && opts.includeLeagues.length > 0) {
    const ph = opts.includeLeagues.map(() => "?").join(", ");
    clauses.push(`competition IN (${ph})`);
    params.push(...opts.includeLeagues);
  }
  if (opts.excludeLeagues && opts.excludeLeagues.length > 0) {
    const ph = opts.excludeLeagues.map(() => "?").join(", ");
    clauses.push(`competition NOT IN (${ph})`);
    params.push(...opts.excludeLeagues);
  }
  if (opts.seasonFrom !== undefined) {
    clauses.push("CAST(season AS REAL) >= ?");
    params.push(opts.seasonFrom);
  }
  if (opts.seasonTo !== undefined) {
    clauses.push("CAST(season AS REAL) <= ?");
    params.push(opts.seasonTo);
  }

  const where =
    clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  return db
    .prepare(`
      SELECT player_id, player_name, club_id, club_name, season
      FROM appearances
      ${where}
    `)
    .all(...params) as Appearance[];
}

// Min/max season year in the dataset, for the Practice season-range controls.
export function getSeasonBounds(): { min: number; max: number } {
  const row = db
    .prepare(`
      SELECT MIN(CAST(season AS REAL)) AS min,
             MAX(CAST(season AS REAL)) AS max
      FROM appearances
    `)
    .get() as { min: number; max: number };
  return { min: Math.floor(row.min), max: Math.floor(row.max) };
}

export function getPlayerById(
  id: string
): PlayerRef | undefined {
  return db
    .prepare(`
      SELECT player_id AS id, player_name AS name
      FROM appearances
      WHERE player_id = ?
      LIMIT 1
    `)
    .get(id) as PlayerRef | undefined;
}

export function searchPlayers(query: string): PlayerRef[] {
  return db
    .prepare(`
      SELECT DISTINCT player_id AS id, player_name AS name
      FROM appearances
      WHERE player_name LIKE ?
      ORDER BY player_name
      LIMIT 20
    `)
    .all(`%${query}%`) as PlayerRef[];
}

export function getCompetitions(): string[] {
  return (
    db
      .prepare(`
        SELECT DISTINCT competition
        FROM appearances
        ORDER BY competition
      `)
      .all() as { competition: string }[]
  ).map((row) => row.competition);
}

// Player ids with rank <= maxRank, 1 being the most recognisable. Players
// absent from the table are rank 5, so maxRank 5 means "everyone" and the
// caller should skip gating rather than call this. See docs/roadmap.md.
export function getPlayerIdsByMaxRank(
  maxRank: number
): Set<string> {
  const built = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name = 'player_obscurity'`
    )
    .get();

  if (!built) {
    throw new Error(
      "player_obscurity is missing - run: npx tsx scripts/build-obscurity.ts --write"
    );
  }

  const rows = db
    .prepare(
      `SELECT player_id AS id FROM player_obscurity WHERE rank <= ?`
    )
    .all(maxRank) as { id: string }[];

  return new Set(rows.map((row) => row.id));
}

// League/season restriction for the club-collapsed board, mirroring the
// AppearanceFilter the solve graph is built with. It exists so the no-year board
// (docs/easy-mode.md) offers exactly the clubs/teammates the puzzle's graph
// contains — no more, no less. Daily/Expert pass nothing (full graph); Practice
// and Challenge pass their filters so the shown optimal can't be beaten (see
// docs/graph-consistency.md).
export type OptionFilter = {
  includeLeagues?: string[];
  excludeLeagues?: string[];
  seasonFrom?: number;
  seasonTo?: number;
};

// A teammate on the collapsed board, plus the seasons they shared with the
// player at the club — surfaced only so the path can label the link with the
// year(s) they actually overlapped.
export type ClubTeammate = {
  id: string;
  name: string;
  seasons: string[];
};

// Builds the shared WHERE fragment (with leading " AND ") and its params for an
// OptionFilter, so the same restriction can be applied to both the outer query
// and the inner seasons sub-select.
function optionFilterSql(f: OptionFilter): {
  sql: string;
  params: (string | number)[];
} {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (f.includeLeagues && f.includeLeagues.length > 0) {
    const ph = f.includeLeagues.map(() => "?").join(", ");
    clauses.push(`competition IN (${ph})`);
    params.push(...f.includeLeagues);
  }
  if (f.excludeLeagues && f.excludeLeagues.length > 0) {
    const ph = f.excludeLeagues.map(() => "?").join(", ");
    clauses.push(`competition NOT IN (${ph})`);
    params.push(...f.excludeLeagues);
  }
  if (f.seasonFrom !== undefined) {
    clauses.push("CAST(season AS REAL) >= ?");
    params.push(f.seasonFrom);
  }
  if (f.seasonTo !== undefined) {
    clauses.push("CAST(season AS REAL) <= ?");
    params.push(f.seasonTo);
  }

  return {
    sql: clauses.length > 0 ? ` AND ${clauses.join(" AND ")}` : "",
    params,
  };
}

// A player's distinct clubs (season collapsed), most-recent first. The board
// (docs/easy-mode.md) picks a club rather than a specific club-season. `years`
// is the distinct season years the player was at the club (ascending), so the
// option can show their tenure to anchor the era — kept as the full set rather
// than a min/max range so a return to a club renders as separate spells (e.g.
// Fowler's Liverpool "1992–2001, 2005–2006") instead of one span that swallows
// the seasons he was away. It reflects the same filtered rows, so under a
// season/league filter it narrows to what's actually playable. `filter` keeps
// the offered clubs inside the puzzle's graph for the filtered modes.
export function getPlayerClubs(
  playerId: string,
  filter: OptionFilter = {}
): { clubId: string; club: string; years: number[] }[] {
  const f = optionFilterSql(filter);
  const rows = db
    .prepare(`
      SELECT DISTINCT club_id AS clubId, club_name AS club,
             CAST(season AS REAL) AS year
      FROM appearances
      WHERE player_id = ?${f.sql}
    `)
    .all(playerId, ...f.params) as {
    clubId: string;
    club: string;
    year: number;
  }[];

  // Collapse to one entry per club, gathering the years they were there. Order
  // clubs by their most-recent year so the familiar "latest club first" order
  // the board has always shown is preserved.
  const byClub = new Map<
    string,
    { clubId: string; club: string; years: number[] }
  >();
  for (const row of rows) {
    const year = Math.floor(row.year);
    const entry = byClub.get(row.clubId);
    if (entry) entry.years.push(year);
    else
      byClub.set(row.clubId, {
        clubId: row.clubId,
        club: row.club,
        years: [year],
      });
  }

  return [...byClub.values()]
    .map((e) => ({
      ...e,
      years: [...new Set(e.years)].sort((a, b) => a - b),
    }))
    .sort(
      (a, b) => b.years[b.years.length - 1] - a.years[a.years.length - 1]
    );
}

// Teammates of `playerId` at `clubId`: players who were at that club in a season
// the player was also there, with those shared seasons. Preserves real teammate
// connectivity (an era relay must go through a real overlapping teammate) while
// letting the board collapse the season away. `filter` applies to both sides of
// the overlap so it matches the filtered solve graph exactly.
export function getClubTeammates(
  playerId: string,
  clubId: string,
  filter: OptionFilter = {}
): ClubTeammate[] {
  const f = optionFilterSql(filter);
  const rows = db
    .prepare(`
      SELECT DISTINCT player_id AS id, player_name AS name, season
      FROM appearances
      WHERE club_id = ?${f.sql}
        AND season IN (
          SELECT season FROM appearances
          WHERE player_id = ? AND club_id = ?${f.sql}
        )
      ORDER BY player_name
    `)
    .all(clubId, ...f.params, playerId, clubId, ...f.params) as {
    id: string;
    name: string;
    season: string;
  }[];

  // Collapse the per-season rows into one entry per teammate, preserving the
  // name ordering and gathering the shared seasons for the path label.
  const byId = new Map<string, ClubTeammate>();
  for (const row of rows) {
    const existing = byId.get(row.id);
    if (existing) {
      existing.seasons.push(row.season);
    } else {
      byId.set(row.id, {
        id: row.id,
        name: row.name,
        seasons: [row.season],
      });
    }
  }
  return [...byId.values()];
}

// Player ids with any appearance in season `minSeason` or later, i.e. players
// who were active recently. Used to keep the Daily's target recognisable.
export function getRecentPlayerIds(
  minSeason: number
): Set<string> {
  const rows = db
    .prepare(`
      SELECT DISTINCT player_id AS id
      FROM appearances
      WHERE CAST(season AS REAL) >= ?
    `)
    .all(minSeason) as { id: string }[];

  return new Set(rows.map((row) => row.id));
}

