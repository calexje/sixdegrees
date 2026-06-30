# Football Degrees

A six-degrees-of-separation puzzle game for footballers. Connect two players
through clubs they shared: the path alternates **player → club-season → player →
…** (e.g. _Steven Gerrard → Liverpool FC (2014) → Glen Johnson → Chelsea FC
(2007) → Frank Lampard_). Inspired by [Six Degrees of Kevin Bacon](https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon), and a conversation about the career of [James Milner] (https://www.skysports.com/football/news/11095/13549725/james-milner-premier-league-record-appearance-holder-announces-retirement-at-age-of-40-after-24-year-top-flight-career)

## Modes

- **Daily** – one puzzle per day (seeded by date), Premier League only.
- **Expert** – same idea, but the full multi-league dataset.
- **Practice** – unlimited quick random puzzles.
- **Challenge** – build your own puzzle from two players and share it via URL.
  Optional constraints: a required waypoint player, an excluded player, and
  league filters. The link encodes everything (players by id); no backend
  storage.

Each puzzle shows a difficulty rating (Basic/Easy/Medium/Hard/Expert) derived
from the true shortest-path distance, hints (most-recent club, full career, and
a "best move" suggestion), and a win screen with an optional optimal-route
reveal. Daily streak / games-played are kept in `localStorage`.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with `@theme` design tokens (no component library)
- State is plain React (`useState`/`useEffect`) plus Server Components; mode and
  challenge config live in URL search params. No Redux/Zustand/React Query.
- **better-sqlite3** over a committed SQLite file (`database/football.db`)
- The connection graph and all path logic (BFS shortest path, waypoints,
  excluded nodes, best-move) are hand-rolled in `lib/graph.ts` — no graph
  library.

## Pathfinding (BFS)

The connection graph is unweighted (every move costs the same), so pathfinding
uses breadth-first search rather than anything heavier. BFS explores outward in
rings from a starting node, so the first time it reaches a player it has already
found the shortest route there. The key to scaling is that it tracks distance
per _node_, not per _path_ — it never enumerates the astronomical number of
routes between two players, so its work stays linear in the size of the graph
 and stays fast across the ~277k-appearance dataset. A single sweep
also gives the distance from one node to every other, which is how the
"best move" hint is computed in one pass, and searches are depth-capped so a
puzzle only explores the relevant neighbourhood instead of the whole graph.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run lint`.

> this repo uses a customised Next.js build; see node_modules/next/dist/docs/ for accurate API reference before relying on memory

## Data

`database/football.db` holds ~277k appearance rows across 12 European leagues
(scraped from Transfermarkt). It is rebuilt from the per-competition JSON files
in `scripts/data/`:

```bash
cd scripts && npx tsx import.ts
```

The import tags each row with its competition, and de-duplicates club-seasons
that the source duplicates across tiers (top-flight clubs that also appear in
second-division files with identical squads).

## Project structure

- `app/page.tsx` – server component; resolves mode and renders the game or the
  challenge builder
- `app/api/*` – route handlers (player, clubseason, search, hint,
  challenge/validate, puzzle)
- `components/game.tsx` – the main game UI; `challenge-builder.tsx`, `header`,
  `footer`
- `lib/db.ts` – SQLite queries (opened read-only)
- `lib/graph.ts` – graph build + BFS helpers
- `lib/puzzle.tsx` – daily/expert/practice generation and the challenge resolver
- `lib/{leagues,format,difficulty,stats,rate-limit}.ts` – small helpers
- `docs/challenge-mode.md` – challenge mode spec

## Deployment

Deploys on Vercel from `main`. Two things matter for the SQLite file on
serverless:

- The DB is committed in rollback-journal mode (not WAL) and opened **read-only**
  — Vercel's function filesystem is read-only, and WAL needs to write a `-shm`
  file.
- `next.config.ts` uses `outputFileTracingIncludes` to bundle `football.db` into
  the functions, since Vercel can't trace a runtime string path on its own.

The graph is rebuilt in memory per cold start from the ~26 MB DB; fine for now,
but the natural next step at scale is a hosted database (e.g. libSQL/Turso) or a
precomputed graph rather than shipping and parsing SQLite on every cold boot.
