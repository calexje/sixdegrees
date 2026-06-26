import Database from "better-sqlite3";

export type Appearance = {
  player_name: string;
  club_name: string;
  season: string;
};

const db = new Database("database/football.db");

export function getPlayerFromClubSeasons(player: string) {
  return db
    .prepare(`
      SELECT club_name AS club, season
      FROM appearances
      WHERE player_name = ?
    `)
    .all(player);
}

export function getClubSeasonFromPlayers(
  club: string,
  season: string
) {
  return db
    .prepare(`
      SELECT player_name AS player
      FROM appearances
      WHERE club_name = ?
      AND season = ?
    `)
    .all(club, season);
}

export function getAllAppearances(): Appearance[] {
  return db
    .prepare(`
      SELECT player_name, club_name, season
      FROM appearances
    `)
    .all() as Appearance[];
}

