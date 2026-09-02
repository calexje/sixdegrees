import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import Database from "better-sqlite3";
// how famous is a footballer? Depends on how many wikipedia articles they have...
const SPARQL_URL = "https://query.wikidata.org/sparql";
// they require identification...
const USER_AGENT =
  "footylinks-fame/1.0 (https://github.com/calexje/sixdegrees)";
const BATCH_SIZE = 500;
const DELAY_MS = 1000;
const MAX_RETRIES = 5;
const ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(ROOT, "database", "football.db");
const BATCH_DIR = path.join(ROOT, "scripts", "data-fame");

type FameRow = {
  playerId: string;
  wikidataId: string | null;
  editions: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQuery(ids: string[]): string {
  const values = ids.map((id) => `"${id}"`).join(" ");
  return `
    SELECT ?tmid ?item (COUNT(DISTINCT ?sl) AS ?langs) WHERE {
      VALUES ?tmid { ${values} }
      ?item wdt:P2446 ?tmid .
      ?sl schema:about ?item .
    }
    GROUP BY ?tmid ?item
  `;
}

async function runQuery(
  ids: string[]
): Promise<Map<string, { wikidataId: string; editions: number }>> {
  const body = new URLSearchParams({ query: buildQuery(ids) });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(SPARQL_URL, {
        method: "POST",
        headers: {
          Accept: "application/sparql-results+json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body,
      });

      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(
          response.headers.get("retry-after")
        );

        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 2000 * 2 ** (attempt - 1);

        if (attempt < MAX_RETRIES) {
          console.log(
            `    ${response.status}, retry ${attempt}/${MAX_RETRIES} in ${wait}ms`
          );
          await sleep(wait);
          continue;
        }
      }

      if (!response.ok) {
        throw new Error(
          `${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as {
        results: {
          bindings: {
            tmid: { value: string };
            item: { value: string };
            langs: { value: string };
          }[];
        };
      };

      const found = new Map<
        string,
        { wikidataId: string; editions: number }
      >();

      for (const row of data.results.bindings) {
        const tmid = row.tmid.value;
        const editions = Number(row.langs.value);
        const wikidataId = row.item.value.split("/").pop() ?? "";

        const existing = found.get(tmid);
        if (!existing || editions > existing.editions) {
          found.set(tmid, { wikidataId, editions });
        }
      }

      return found;
    } catch (err) {
      if (attempt >= MAX_RETRIES) throw err;

      const wait = 2000 * 2 ** (attempt - 1);
      console.log(
        `    network error, retry ${attempt}/${MAX_RETRIES} in ${wait}ms`
      );
      await sleep(wait);
    }
  }

  throw new Error("unreachable: retries exhausted without throwing");
}

function fillMissing(
  ids: string[],
  found: Map<string, { wikidataId: string; editions: number }>
): FameRow[] {
  return ids.map((playerId) => {
    const hit = found.get(playerId);

    return {
      playerId,
      wikidataId: hit ? hit.wikidataId : null,
      editions: hit ? hit.editions : 0,
    };
  });
}

async function fetchAll(ids: string[]): Promise<void> {
  await fsp.mkdir(BATCH_DIR, { recursive: true });

  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    batches.push(ids.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `${ids.length} players in ${batches.length} batches of ${BATCH_SIZE}`
  );

  for (let i = 0; i < batches.length; i++) {
    const file = path.join(
      BATCH_DIR,
      `fame-${String(i).padStart(4, "0")}.json`
    );

    if (fs.existsSync(file)) {
      continue;
    }

    const found = await runQuery(batches[i]);
    const rows = fillMissing(batches[i], found);

    await fsp.writeFile(
      file,
      JSON.stringify(rows, null, 2),
      "utf8"
    );

    const matched = rows.filter((r) => r.wikidataId).length;
    console.log(
      `  batch ${i + 1}/${batches.length}: ${matched}/${rows.length} matched`
    );

    await sleep(DELAY_MS);
  }
}

function loadIntoDb(db: Database.Database): number {
  const files = fs
    .readdirSync(BATCH_DIR)
    .filter((f: string) => f.endsWith(".json"))
    .sort();

  db.exec(`
    DROP TABLE IF EXISTS player_fame;

    CREATE TABLE player_fame (
        player_id TEXT PRIMARY KEY,
        wikidata_id TEXT,
        editions INTEGER NOT NULL
    );
  `);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO player_fame
    (player_id, wikidata_id, editions)
    VALUES (?, ?, ?)
  `);

  const insertAll = db.transaction((rows: FameRow[]) => {
    for (const row of rows) {
      insert.run(row.playerId, row.wikidataId, row.editions);
    }
  });

  let total = 0;

  for (const file of files) {
    const rows = JSON.parse(
      fs.readFileSync(path.join(BATCH_DIR, file), "utf8")
    ) as FameRow[];

    insertAll(rows);
    total += rows.length;
  }

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_fame_editions ON player_fame(editions)`
  );

  return total;
}

async function main() {
  const db = new Database(DB_PATH);

  const ids = (
    db
      .prepare(
        `SELECT DISTINCT player_id FROM appearances ORDER BY player_id`
      )
      .all() as { player_id: string }[]
  ).map((row) => row.player_id);

  await fetchAll(ids);

  const total = loadIntoDb(db);
  console.log(`\nLoaded ${total} rows into player_fame`);

  const summary = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN wikidata_id IS NULL THEN 1 ELSE 0 END) AS no_entity,
              MAX(editions) AS max_editions
       FROM player_fame`
    )
    .get() as {
    total: number;
    no_entity: number;
    max_editions: number;
  };

  console.log(
    `  ${summary.total} players, ${summary.no_entity} with no Wikidata entity, max ${summary.max_editions} editions`
  );

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
