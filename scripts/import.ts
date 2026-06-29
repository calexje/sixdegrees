const fs = require("fs/promises");
const Database = require("better-sqlite3");

const COMPETITIONS = ["GB1","ES1","IT1","L1","FR1","PO1","GB2","ES2","IT2","L2","FR2","PO2"];

const db = new Database("../database/football.db");

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA synchronous = OFF;
`);

db.exec(`
DROP TABLE IF EXISTS appearances;

CREATE TABLE appearances (
    player_id TEXT,
    player_name TEXT,
    club_id TEXT,
    club_name TEXT,
    season TEXT,
    competition TEXT
);
`);

const insert = db.prepare(`
    INSERT INTO appearances
    (player_id, player_name, club_id, club_name, season, competition)
    VALUES (?, ?, ?, ?, ?, ?)
`);

// Some top-flight clubs are duplicated into the second-tier files for the same
// season (identical squads). Competitions are imported top tier first (GB1
// before GB2, PO1 before PO2, ...), so once a club-season has been imported we
// skip any later copy and keep the higher-tier record.
const importedClubSeasons = new Set<string>();

const importSeason = db.transaction((data : any) => {
    for (const club of data.clubs) {
        const key = `${club.id}:${data.season}`;
        if (importedClubSeasons.has(key)) {
            continue;
        }
        importedClubSeasons.add(key);

        for (const player of club.players) {
            insert.run(
                player.id,
                player.name,
                club.id,
                club.name,
                data.season,
                data.competitionId
            );
        }
    }
});

function createIndexes() {
    console.log("Creating indexes...");

    db.exec(`
    CREATE INDEX idx_player_id
    ON appearances(player_id);

    CREATE INDEX idx_club_season
    ON appearances(club_id, season);

    CREATE INDEX idx_player_name
    ON appearances(player_name);

    CREATE INDEX idx_competition
    ON appearances(competition);
    `);

    console.log("Done");
}

async function main() {
    for (const competitionId of COMPETITIONS) {
        for (let year = 2025; year >= 1990; year--) {
            const filePath = `data/${competitionId}-${year}.json`;

            console.log(`Reading ${filePath}`);

            try {
                const raw = await fs.readFile(filePath, "utf8");
                const data = JSON.parse(raw);

                importSeason(data);

            } catch (err: any) {
                if (err.code === "ENOENT") {
                    continue;
                }

                throw err;
            }
        }
    }

    createIndexes();
    db.close();
}

main().catch(console.error);