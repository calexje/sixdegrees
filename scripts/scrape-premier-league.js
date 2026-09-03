const fs = require("fs/promises");
const { load } = require("cheerio");

const COMPETITIONS = [
    "GB1",
    "EFD1",
    "ES1",
    "IT1",
    "L1",
    "FR1",
    "PO1",
    "GB2",
    "EFD2",
    "ES2",
    "IT2",
    "L2",
    "L2N",
    "L2S",
    "FR2",
    "PO2"
];

const START_SEASON = 2026;

const MAX_MISSING_SEASONS = 3;

const BASE_URL = "https://www.transfermarkt.com";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHtml(url, retries = 5) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "TransfermarktCrawler/1.0"
                }
            });

            if (response.ok) {
                return await response.text();
            }

            if (response.status === 404) {
                const error = new Error(`404 Not Found`);
                error.status = 404;
                throw error;
            }

            if (response.status >= 500 && attempt < retries) {
                console.log(
                    `    ${response.status} retry ${attempt}/${retries}`
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
        `${BASE_URL}/x/startseite/wettbewerb/${competitionId}/plus/?saison_id=${seasonId}`;

    const $ = load(await fetchHtml(url));

    const found = [];

    $('td.hauptlink a[href*="/startseite/verein/"]').each((_, el) => {
        const match = ($(el).attr("href") || "").match(
            /\/startseite\/verein\/(\d+)\/saison_id\/(\d+)/
        );

        if (match) {
            found.push({
                id: match[1],
                servedSeason: match[2],
                name: $(el).text().trim()
            });
        }
    });

   if (
        found.length === 0 ||
        found[0].servedSeason !== String(seasonId)
    ) {
        const err = new Error("Competition season not found");
        err.status = 404;
        throw err;
    }

    const clubs = [];
    const seen = new Set();

    for (const club of found) {
        if (seen.has(club.id)) {
            continue;
        }

        seen.add(club.id);
        clubs.push({ id: club.id, name: club.name });
    }

    return clubs;
}

async function getPlayers(clubId, seasonId) {
    const url =
        `${BASE_URL}/x/leistungsdaten/verein/${clubId}/saison_id/${seasonId}/plus/1`;

    const $ = load(await fetchHtml(url));

    const players = [];

    $("table.items tr").each((_, tr) => {
        const row = $(tr);
        if (row.children("td.posrela").length === 0) {
            return;
        }

        const link = row
            .find('td.posrela a[href*="/profil/spieler/"]')
            .first();

        const match = (link.attr("href") || "").match(
            /\/profil\/spieler\/(\d+)/
        );

        if (!match) {
            return;
        }

        // Second row of the nested inline table: "Goalkeeper", "Centre-Back".
        const position = row
            .find("td.posrela tr")
            .eq(1)
            .text()
            .trim();

        // Minutes are the one cell rendered as digits followed by an
        // apostrophe ("3.330'"), thousands separated European-style. Absent
        // for anyone who never got on the pitch, which is kept as null rather
        // than 0 so "did not play" stays distinct from "played and was
        // subbed at kickoff".
        let minutes = null;

        row.children("td").each((__, td) => {
            const text = $(td).text().trim();

            if (/^[\d.]+'$/.test(text)) {
                minutes = Number(text.replace(/[.']/g, ""));
            }
        });

        players.push({
            id: match[1],
            name: link.text().trim(),
            position,
            minutes
        });
    });

    return players;
}

async function processCompetition(
    competitionId
) {
    console.log(
        `\n========== ${competitionId} ==========`
    );

    let missing = 0;
    let seenData = false;

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

            seenData = true;
            missing = 0;

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
                // Misses only count once the competition has been seen to have
                // data. A defunct one has none near the top of the range —
                // EFD1 ended in 1992, L2N/L2S ran for a single season — so
                // counting down from START_SEASON would break decades before
                // reaching its actual seasons.
                if (!seenData) {
                    console.log(
                        `No data for ${competitionId}-${season} (before this competition existed)`
                    );

                    continue;
                }

                missing++;

                if (missing >= MAX_MISSING_SEASONS) {
                    console.log(
                        `Competition starts before ${season + MAX_MISSING_SEASONS}`
                    );

                    break;
                }

                console.log(
                    `No data for ${competitionId}-${season} (${missing}/${MAX_MISSING_SEASONS} consecutive)`
                );

                continue;
            }

            console.error(
                `Failed season ${season}`,
                err.message
            );

            continue;
        }

        seenData = true;
        missing = 0;

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
                        name: player.name,
                        position: player.position,
                        minutes: player.minutes
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
