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

// The Big-5 top flights. A player's count of distinct seasons in these is our
// prominence proxy: it rewards the long, well-travelled careers people actually
// recognise, rather than current market value (which favours young hype).
const TOP_FLIGHT = ["GB1", "ES1", "IT1", "L1", "FR1"];

// Player ids with at least `minSeasons` distinct top-flight seasons. Keyed by
// id, so distinct players who share a name are counted separately.
export function getProminentPlayerIds(
  minSeasons: number
): Set<string> {
  const placeholders = TOP_FLIGHT.map(() => "?").join(", ");
  const rows = db
    .prepare(`
      SELECT player_id AS id
      FROM appearances
      WHERE competition IN (${placeholders})
      GROUP BY player_id
      HAVING COUNT(DISTINCT season) >= ?
    `)
    .all(...TOP_FLIGHT, minSeasons) as { id: string }[];

  return new Set(rows.map((row) => row.id));
}

// A player's distinct clubs (season collapsed), most-recent first. Easy mode
// (docs/easy-mode.md) picks a club rather than a specific club-season.
export function getPlayerClubs(
  playerId: string
): { clubId: string; club: string }[] {
  return db
    .prepare(`
      SELECT club_id AS clubId, club_name AS club,
             MAX(CAST(season AS REAL)) AS recent
      FROM appearances
      WHERE player_id = ?
      GROUP BY club_id
      ORDER BY recent DESC
    `)
    .all(playerId) as {
    clubId: string;
    club: string;
  }[];
}

// Teammates of `playerId` at `clubId`: players who were at that club in a season
// the player was also there. Preserves real teammate connectivity while letting
// Easy mode collapse the season away.
export function getClubTeammates(
  playerId: string,
  clubId: string
): PlayerRef[] {
  return db
    .prepare(`
      SELECT DISTINCT player_id AS id, player_name AS name
      FROM appearances
      WHERE club_id = ?
        AND season IN (
          SELECT season FROM appearances
          WHERE player_id = ? AND club_id = ?
        )
      ORDER BY player_name
    `)
    .all(clubId, playerId, clubId) as PlayerRef[];
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

