import Database from "better-sqlite3";

export type Appearance = {
  player_name: string;
  club_name: string;
  season: string;
  competition?: string;
};

export type PlayerRef = {
  id: string;
  name: string;
};

const db = new Database("database/football.db");

export function getPlayerFromClubSeasons(player: string) {
  return db
    .prepare(`
      SELECT DISTINCT club_name AS club, season, competition
      FROM appearances
      WHERE player_name = ?
      ORDER BY CAST(season AS REAL) DESC
    `)
    .all(player);
}

export function getClubSeasonFromPlayers(
  club: string,
  season: string
) {
  return db
    .prepare(`
      SELECT DISTINCT player_name AS player
      FROM appearances
      WHERE club_name = ?
      AND season = ?
      ORDER BY player_name
    `)
    .all(club, season);
}

export function getAllAppearances(
  opts: { competition?: string; excludeLeagues?: string[] } = {}
): Appearance[] {
  const { competition, excludeLeagues } = opts;

  if (competition) {
    return db
      .prepare(`
        SELECT player_name, club_name, season
        FROM appearances
        WHERE competition = ?
      `)
      .all(competition) as Appearance[];
  }

  if (excludeLeagues && excludeLeagues.length > 0) {
    const placeholders = excludeLeagues
      .map(() => "?")
      .join(", ");

    return db
      .prepare(`
        SELECT player_name, club_name, season
        FROM appearances
        WHERE competition NOT IN (${placeholders})
      `)
      .all(...excludeLeagues) as Appearance[];
  }

  return db
    .prepare(`
      SELECT player_name, club_name, season
      FROM appearances
    `)
    .all() as Appearance[];
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

