const fs = require("fs");
const Database = require("better-sqlite3");
const { parse } = require("csv-parse/sync");

const db = new Database("database/football.db");

db.exec(`
DROP TABLE IF EXISTS appearances;

CREATE TABLE appearances (
    player TEXT NOT NULL,
    club TEXT NOT NULL,
    season TEXT NOT NULL
);
`);

const csv = fs.readFileSync("data/appearances.csv", "utf8");

const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
});

const insert = db.prepare(`
    INSERT INTO appearances
    (player, club, season)
    VALUES (?, ?, ?)
`);

for (const row of rows) {
    if(!row.player) {throw new Error (`Invalid player in row ${JSON.stringify(row)}`)}
    if(!row.club) {throw new Error (`Invalid club in row ${JSON.stringify(row)}`)}
    if(!row.season.match(/^\d{4}-\d{2}$/)) {throw new Error (`Invalid season in row ${JSON.stringify(row)}`)}
    if(row.player && row.club && row.season.match(/^\d{4}-\d{2}$/)) {
        insert.run(
            row.player,
            row.club,
            row.season
        );
    }
}

console.log(`Imported ${rows.length} rows`);