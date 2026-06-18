const fs = require("fs/promises");
const Database = require("better-sqlite3");

const COMPETITIONS = ["GB1","ES1","IT1","L1","FR1","ES2","IT2","L2","FR2"];

const db = new Database("database/football.db");

db.exec(`
DROP TABLE IF EXISTS appearances;

CREATE TABLE appearances (
    player_id TEXT,
    player_name TEXT,
    club_id TEXT,
    club_name TEXT,
    season TEXT
);
`);

const insert = db.prepare(`
    INSERT INTO appearances
    (player_id, player_name, club_id, club_name, season)
    VALUES (?, ?, ?, ?, ?)
`);

async function main() {
    for (const competitionId of COMPETITIONS) {
        const filePath = `data/${competitionId}.json`;

        console.log(`Reading ${filePath}`);

        const raw = await fs.readFile(filePath, "utf8");
        const data = JSON.parse(raw);

        for (const season of Object.keys(data)) {
            const seasonData = data[season];

            if (!seasonData || !seasonData.clubs) continue;

            console.log(`Importing ${competitionId} season ${season}`);

            for (const club of seasonData.clubs) {
                for (const player of club.players) {
                    insert.run(
                        player.id,
                        player.name,
                        club.id,
                        club.name,
                        season
                    );
                }
            }
        }
    }

    console.log("Done");
}

main().catch(console.error);