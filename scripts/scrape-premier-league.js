const fs = require("fs/promises");
const { load } = require("cheerio");

// Order is load-bearing: import.ts keeps the first tier that claims a shared
// club-season, so every first tier must precede every second tier.
//
// England is split across three codes because Transfermarkt models its two
// rebrands as separate competitions, and asking GB1/GB2 for a season before
// theirs silently serves the current one:
//   tier 1:  GB1 1992-  (Premier League)   EFD1 -1991  (First Division)
//   tier 2:  GB2 2004-  (Championship)     EFD2 1992-2003 (First Division)
// ENSD (Second Division, -2003) would add the pre-1992 second tier, but it is
// also the 1992-2003 THIRD tier, which this dataset doesn't otherwise cover.
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
    "FR2",
    "PO2"
];

const START_SEASON = 2026;

// The season loop counts down and stops when Transfermarkt no longer serves a
// competition, but it tolerates this many consecutive misses first. Breaking on
// the very first one is all-or-nothing: a single missing year in the middle of a
// competition's history would silently truncate every season beneath it, and the
// log would look like a legitimate start date rather than a hole.
const MAX_MISSING_SEASONS = 3;

// Scraped straight from Transfermarkt rather than through the
// transfermarkt-api wrapper this used to call. The wrapper's public instance
// has returned 500 on every endpoint since July 2026 (its issue #121), it rate
// limits itself to 2 requests per 3 seconds, and — decisively — its squad
// endpoint carries no minutes at all. Minutes only exist on the club's season
// performance page, so going through the wrapper would have meant writing new
// Python to reach a page we can parse directly.
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

    // Transfermarkt serves the CURRENT season when asked for one that never
    // existed — GB1 with saison_id=1946 returns the 26/27 table, twenty clubs
    // and all — where the old API wrapper returned a clean 404. Without this
    // check the season loop below would never terminate, and every year before
    // a competition began would be written to disk full of present-day squads.
    // The season echoed back inside each club link is the reliable tell, so a
    // mismatch is raised as the same 404-shaped error the loop already breaks
    // on.
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
    // The season performance page, not the squad page: it lists everyone who
    // was at the club that season (rather than only the present squad) and
    // carries position and minutes in the same table, so membership, the
    // goalkeeper debuff and the "seasons as a regular" metric all come from
    // one request per club-season.
    const url =
        `${BASE_URL}/x/leistungsdaten/verein/${clubId}/saison_id/${seasonId}/plus/1`;

    const $ = load(await fetchHtml(url));

    const players = [];

    $("table.items tr").each((_, tr) => {
        const row = $(tr);

        // Player rows are the ones with a posrela cell as a *direct* child.
        // The filter matters: each player's name and position live in an
        // inline table nested inside that cell, so an unfiltered `tr` sweep
        // returns 88 rows for a 29-player squad.
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
