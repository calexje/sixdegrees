const fs = require("fs/promises");

const COMPETITIONS = [
    //"GB1",
    "ES1"/*,
    "IT1",
    "L1",
    //"FR1",
    "PO1",
    "GB2",
    "ES2",
    "IT2",
    "L2",
    "FR2",
    "PO2"*/
];

const START_SEASON = 2012 //2025;

const BASE_URL = "https://transfermarkt-api.fly.dev";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, retries = 5) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "TransfermarktCrawler/1.0"
                }
            });

            if (response.ok) {
                return await response.json();
            }

            if (response.status === 404) {
                const error = new Error(`404 Not Found`);
                error.status = 404;
                throw error;
            }

            if (response.status === 502 && attempt < retries) {
                console.log(
                    `    502 retry ${attempt}/${retries}`
                );

                await sleep(5000);
                continue;
            }

            throw new Error(
                `${response.status} ${response.statusText}`
            );
        } catch (err) {
            if (
                attempt < retries &&
                !err.status
            ) {
                console.log(
                    `    Network retry ${attempt}/${retries}`
                );

                await sleep(5000);
                continue;
            }

            throw err;
        }
    }
}

async function getClubs(competitionId, seasonId) {
    const url =
        `${BASE_URL}/competitions/${competitionId}/clubs?season_id=${seasonId}`;

    const data = await fetchJson(url);

    if (data.detail?.includes("Not Found")) {
        const err = new Error("Competition season not found");
        err.status = 404;
        throw err;
    }

    return data.clubs || [];
}

async function getPlayers(clubId, seasonId) {
    const url =
        `${BASE_URL}/clubs/${clubId}/players?season_id=${seasonId}`;

    const data = await fetchJson(url);

    return data.players || [];
}

async function processCompetition(
    competitionId
) {
    console.log(
        `\n========== ${competitionId} ==========`
    );
    for (
        let season = START_SEASON;
        season >= 1990;
        season--
    ) {
        console.log(
            `\nSeason ${season}`
        );
        try {
            await fs.access(
                `data/${competitionId}-${season}.json`
            );

            console.log(
                `Skipping ${competitionId}-${season}, already exists`
            );

            continue;
        } catch {}
        let clubs;

        try {
            clubs = await getClubs(
                competitionId,
                season
            );
        } catch (err) {
            if (err.status === 404) {
                console.log(
                    `Competition starts before ${season + 1}`
                );

                break;
            }

            console.error(
                `Failed season ${season}`,
                err.message
            );

            continue;
        }

        const seasonData = {
            competitionId,
            season,
            clubs: []
        };

        for (let i = 0; i < clubs.length; i++) {
            const club = clubs[i];
            try {
                const players =
                    await getPlayers(
                        club.id,
                        season
                    );

                seasonData.clubs.push({
                    id: club.id,
                    name: club.name,
                    players: players.map(player => ({
                        id: player.id,
                        name: player.name
                    }))
                });

                await fs.writeFile(
                    `data/${competitionId}-${season}.json`,
                    JSON.stringify(seasonData, null, 2)
                );
                process.stdout.write(`\r[${i + 1}/${clubs.length}] ${club.name.padEnd(25)} - ${competitionId}-${season}`);
            } catch (err) {
                console.error(
                    `    Failed players for ${club.name}`,
                    err.message
                );
            }

            await sleep(250);
        }
        process.stdout.write("\n");
        console.log(
            `Saved ${competitionId}-${season}.json`
        );
    }
}

async function main() {
    await fs.mkdir(
        "data",
        { recursive: true }
    );

    for (const competitionId of COMPETITIONS) {
        try {
            await processCompetition(
                competitionId
            );
        } catch (err) {
            console.error(
                `Competition failed ${competitionId}`,
                err
            );
        }
    }

    console.log("Done");
}

main().catch(console.error);