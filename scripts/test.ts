import Database from "better-sqlite3";

const db = new Database("database/football.db");

const rows = db
  .prepare(`
    SELECT *
    FROM appearances
    WHERE player = ?
  `)
  .all("Ryan Giggs");

console.log(rows);