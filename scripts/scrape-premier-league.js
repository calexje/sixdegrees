const fs = require("fs/promises");

const COMPETITIONS = [
    "GB1",
    "ES1",
    "IT1",
    "L1",
    "FR1",
    "ES2",
    "IT2",
    "L2",
    "FR2"
];

const START_SEASON = 2025;

const BASE_URL = "https://transfermarkt-api.fly.dev";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, retries = 3) {
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

    return data.clubs || [];
}

async function getPlayers(clubId, seasonId) {
    const url =
        `${BASE_URL}/clubs/${clubId}/players?season_id=${seasonId}`;

    const data = await fetchJson(url);

    return data.players || [];
}

async function saveCompetitionIndex(
    competitionId,
    output
) {
    await fs.writeFile(
        `data/${competitionId}.json`,
        JSON.stringify(output, null, 2)
    );
}

async function processCompetition(
    competitionId
) {
    console.log(
        `\n========== ${competitionId} ==========`
    );

    const output = {};

    for (
        let season = START_SEASON;
        season >= 1900;
        season--
    ) {
        console.log(
            `\nSeason ${season}`
        );

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

        for (const club of clubs) {
            try {
                const players =
                    await getPlayers(
                        club.id,
                        season
                    );

                seasonData.clubs.push({
                    id: club.id,
                    name: club.name,
                    players: players.map(
                        player => ({
                            id: player.id,
                            name: player.name
                        })
                    )
                });
            } catch (err) {
                console.error(
                    `    Failed players for ${club.name}`,
                    err.message
                );
            }

            await sleep(250);
        }

        output[season] = seasonData;

        await fs.writeFile(
            `data/${competitionId}-${season}.json`,
            JSON.stringify(
                seasonData,
                null,
                2
            )
        );

        await saveCompetitionIndex(
            competitionId,
            output
        );

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