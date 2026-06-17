import Database from "better-sqlite3";

export type Appearance = {
  player: string;
  club: string;
  season: string;
};

const db = new Database("database/football.db");

export function getPlayerFromClubSeasons(player: string) {
  return db
    .prepare(`
      SELECT club, season
      FROM appearances
      WHERE player = ?
    `)
    .all(player);
}

export function getClubSeasonFromPlayers(
  club: string,
  season: string
) {
  return db
    .prepare(`
      SELECT player
      FROM appearances
      WHERE club = ?
      AND season = ?
    `)
    .all(club, season);
}

export function getAllAppearances(): Appearance[] {
  return db
    .prepare(`
      SELECT player, club, season
      FROM appearances
    `)
    .all() as Appearance[];
}

