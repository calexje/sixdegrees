# Challenge Mode — Implementation Spec

## Context

"Create Challenge" exists as a header button and a `mode=challenge` route, but the
feature is a stub. `generateChallengePuzzle()` in [lib/puzzle.tsx](../lib/puzzle.tsx)
just picks a random origin/target from the full graph and returns
`{ origin, target, solution: null, seed }` with **no `solutionDistance`**, so the
hints, the par rating, and the "X moves apart" label silently break when a player
lands in challenge mode. The puzzle is also non-reproducible: every load generates a
new random pair, and the `seed` is never used to reconstruct anything.

The goal is a real, user-authored, shareable challenge: a creator picks two players
and optional constraints, gets a shareable link, and anyone who opens that link
solves the same puzzle with the full Daily experience (optimal distance, hints, par
rating).

This spec covers the agreed behaviour and the changes needed across data, API,
graph, and UI. Decisions already made with the product owner are marked **[decided]**.

## Decisions

- **[decided]** Creator searches for both endpoints by hand (origin and target),
  with a search/autocomplete box for each.
- **[decided]** A challenge is encoded entirely in the URL. No backend storage.
- **[decided]** Players are referenced by `player_id` in the URL (stable, unambiguous);
  ids are resolved to names internally for play and display.
- **[decided]** Constraints: at most **one** required waypoint player, at most **one**
  excluded player, and **many-included / many-excluded** leagues.
- **[decided]** If the constraints make the puzzle unsolvable, **warn but allow** the
  creator to share it anyway.
- **[decided]** The solver sees **all** active constraints (excluded leagues, required
  waypoint, excluded player). Excluded players and leagues also silently disappear
  from the available options.
- **[decided]** The solver experience matches Daily: shortest-solution distance,
  hints, and the par rating, computed with BFS.

## Terminology

- **Origin / Target** — the two endpoints the solver must connect.
- **Waypoint (via)** — an optional player the path **must** pass through. With a
  waypoint set, `Origin → Target` directly does not count; the win requires
  `Origin → ... → Waypoint → ... → Target`.
- **Excluded player** — an optional player the path **cannot** use. The player never
  appears as a selectable option and is removed from BFS.
- **League filter** — the set of competitions allowed in the puzzle. All leagues are
  included by default; the creator can exclude any subset.

## URL scheme

Builder (no endpoints present):

```
/?mode=challenge
```

Solve (a shared challenge):

```
/?mode=challenge&from=<originId>&to=<targetId>[&via=<id>][&not_player=<id>][&not_leagues=GB2,PO1]
```

- `from`, `to` — required for a solvable link; their absence means "show the builder".
- `via` — optional single required-waypoint player id.
- `not_player` — optional single excluded player id.
- `not_leagues` — optional comma-separated competition codes to exclude. Absent means
  all leagues allowed.

## Identity model and its caveat

The traversal graph is keyed on **player name** (`player:<name>`), not id. IDs are
used in the URL and during creation for stability, then resolved to names server-side
before play.

**Known limitation:** two distinct players who share a name are merged into one node
by the name-keyed graph. With ids in the URL this is invisible during selection, but
the solve engine cannot tell them apart. This is a pre-existing property of the graph,
not introduced here. Migrating the graph to id-keyed nodes is **out of scope for v1**
and listed under Future work. Document the caveat; do not block on it.

## Leagues

The competition codes currently in the database (verified, all 12 present after GB2
was added to the import):

```
ES1 ES2 FR1 FR2 GB1 GB2 IT1 IT2 L1 L2 PO1 PO2
```

Display names for the toggle list:

| Code | League                | Code | League                |
|------|-----------------------|------|-----------------------|
| GB1  | Premier League        | GB2  | Championship*         |
| ES1  | La Liga               | ES2  | Segunda División      |
| IT1  | Serie A               | IT2  | Serie B               |
| L1   | Bundesliga            | L2   | 2. Bundesliga         |
| FR1  | Ligue 1               | FR2  | Ligue 2               |
| PO1  | Primeira Liga         | PO2  | Liga Portugal 2       |

**GB2 is now in the DB.** `GB2` was added to the `COMPETITIONS` array in
[scripts/import.ts](../scripts/import.ts) and the database re-imported (281,767 rows,
30,482 of them GB2), so all 12 competitions are available.

To keep the UI and data in sync, **derive the league list from the database** at build
time (`SELECT DISTINCT competition FROM appearances`) rather than hard-coding it, and
map codes to display names from a static table.

## Data layer ([lib/db.ts](../lib/db.ts))

Add:

- `getPlayerById(id: string): { player_id, player_name } | undefined`
  — `SELECT DISTINCT player_id, player_name FROM appearances WHERE player_id = ?`.
  Used to resolve URL ids to names.
- `searchPlayers(query: string): { id, name }[]`
  — `SELECT DISTINCT player_id, player_name FROM appearances WHERE player_name LIKE ? LIMIT 20`.
  Powers the builder autocomplete (returns id so the URL stores ids).
- `getCompetitions(): string[]` — `SELECT DISTINCT competition ...` for the league list.
- Extend `getAllAppearances` to accept an optional league filter, e.g.
  `getAllAppearances(opts?: { excludeLeagues?: string[] })`, building a
  `WHERE competition NOT IN (...)` clause. Keep the existing single-competition
  signature working (used by Daily) or fold both into one options object.

## Graph and BFS ([lib/graph.ts](../lib/graph.ts))

- Generalise `buildGraph` to accept a league filter and pass it to
  `getAllAppearances`, e.g. `buildGraph(opts?: { excludeLeagues?: string[] })`.
- Extend `findShortestPath` to take an optional `blocked: Set<string>` of node keys
  (the excluded player's `player:<name>`); skip blocked nodes during traversal.
- Add a waypoint-aware helper:
  `shortestVia(graph, origin, target, via?, blocked?)` returning the total jump
  distance. With a waypoint it is `dist(origin → via) + dist(via → target)`; without,
  `dist(origin → target)`. Distances are in **jumps** (graph edges / 2), matching how
  Daily reports `solutionDistance`. Return `null` when any segment is unreachable.

### Graph caching (performance)

Building the full graph from ~251k appearances is costly and is done once at module
load for Daily/Expert. For challenges:

- **No excluded leagues** (the common case): reuse the existing module-level
  `fullGraph`.
- **With excluded leagues:** build a filtered graph and cache it in a
  `Map<string, Graph>` keyed by the sorted `not_leagues` CSV, so repeated challenges
  with the same filter reuse the build.

## Puzzle generation ([lib/puzzle.tsx](../lib/puzzle.tsx))

Replace the random `generateChallengePuzzle` with a resolver that takes the parsed URL
params and produces a challenge descriptor:

```
buildChallenge({ fromId, toId, viaId?, notPlayerId?, notLeagues? }) => {
  origin, target,                 // resolved names for play/display
  originId, targetId,
  via?, viaId?,                   // resolved waypoint name + id
  excludedPlayer?, excludedId?,   // resolved excluded name + id
  notLeagues: string[],
  solutionDistance: number | null, // par jumps via shortestVia(); null if unsolvable
  solvable: boolean,
}
```

- Resolve ids to names with `getPlayerById`; if `from`/`to` cannot be resolved, treat
  the link as invalid and fall back to the builder with an error.
- Pick the league-filtered graph (cached) and compute `solutionDistance` with
  `shortestVia`, excluding the excluded player's node.
- `solvable = solutionDistance !== null`.

Add `expert` is already a mode; extend `PuzzleMode` handling so `getPuzzle` is not used
for challenge solve (challenge needs the parsed params, not just the mode string). The
page should call `buildChallenge` directly when challenge params are present.

## Routing ([app/page.tsx](../app/page.tsx))

`searchParams` already drives mode selection. For `mode=challenge`:

- If `from` and `to` are present → **solve**: call `buildChallenge(params)`, render
  `<Game>` with the resolved names plus the constraint props below.
- Otherwise → **create**: render `<ChallengeBuilder>` (the league list passed in from
  `getCompetitions()`).

Pass the new constraint data to `<Game>`: `requiredWaypoint?` (name), `excludedPlayer?`
(name), `notLeagues: string[]`, and `solutionDistance` (which may be `null`).

## Builder UI (new — `components/challenge-builder.tsx`, client component)

- Two required player search boxes (Origin, Target) backed by `/api/search`. Selecting
  a result stores `{ id, name }`.
- Optional "Required waypoint" search box and optional "Excluded player" search box.
- League list: every competition from `getCompetitions()` as a toggle, all included by
  default, plus "Include all" and "Exclude all" buttons. The excluded set maps to
  `not_leagues`.
- Live validation: on any change, call a validation endpoint (or recompute) to show the
  computed par distance, or a warning banner when unsolvable. **Warn but allow** — never
  block link generation.
- Show the generated share URL with a Copy button, and a "Play" button that navigates
  to the solve URL.
- Guard against degenerate inputs with warnings (not hard blocks): origin == target,
  waypoint or excluded equal to origin/target, waypoint == excluded.

## Solver UI ([components/game.tsx](../components/game.tsx))

- Accept new props: `requiredWaypoint?: string`, `excludedPlayer?: string`,
  `notLeagues?: string[]`. `solutionDistance` may now be `null` — handle the "no known
  solution" case in the rating and hint display.
- **Constraint banner** (always shown when constraints exist): excluded leagues by
  display name, "Must pass through: <waypoint>", "Cannot use: <excluded player>".
- **Win condition:** reached target **and** (`requiredWaypoint` is unset **or** the
  built path contains it). Update the existing `won` check accordingly.
- **Option filtering:**
  - Drop the excluded player from the player option lists.
  - Drop club-seasons whose competition is in `notLeagues`. This requires the
    competition on each option, so extend `/api/player` to return `competition`
    alongside `club`/`season`, and have the engine filter on it. `/api/clubseason`
    naturally stays within allowed leagues once club-seasons are filtered, but also
    drop the excluded player from its results.
- Par rating and hints reuse the Daily logic, driven by the BFS `solutionDistance`.

## API routes

- **New** `GET /api/search?q=` → `[{ id, name }]` via `searchPlayers`. Powers the
  builder.
- **Extend** `GET /api/player?name=` → include `competition` per row so the solver can
  filter options by league. (It already aliases `club_name AS club`.)
- **Optional** `GET /api/challenge/validate?...` → `{ solvable, solutionDistance }` for
  live builder feedback. Alternatively compute in the builder via an existing endpoint;
  a dedicated route keeps BFS on the server where the graph lives.
- The misnamed `/api/practice` route still only accepts `daily|practice`; leave it or
  align it separately. It is not part of this feature.

## Validation behaviour

- Builder: compute solvability on every change; if unsolvable, show a clear warning but
  keep the link active (**warn but allow**).
- Solver: an unsolvable link still loads. Show "no known solution" in place of the par
  rating, and the waypoint/excluded constraints still apply to play.

## Out of scope / future work

- Server-side storage, play counts, or leaderboards (the share model is URL-only).
- Migrating the traversal graph from name-keyed to id-keyed nodes (removes the
  same-name merge caveat).
- More than one waypoint or more than one excluded player.
- Adding GB2 (and any other missing competitions) to the dataset, unless chosen as the
  prerequisite above.

## Implementation checklist

1. ~~Add `GB2` to [scripts/import.ts](../scripts/import.ts) and re-import.~~ **Done.**
2. [lib/db.ts](../lib/db.ts): `getPlayerById`, `searchPlayers`, `getCompetitions`,
   league filter on `getAllAppearances`.
3. [lib/graph.ts](../lib/graph.ts): league filter in `buildGraph`, `blocked` set in
   `findShortestPath`, new `shortestVia`, filtered-graph cache.
4. [lib/puzzle.tsx](../lib/puzzle.tsx): `buildChallenge` resolver replacing the random
   stub; remove the unused `solution: null`.
5. [app/page.tsx](../app/page.tsx): route builder vs solve; resolve ids; pass
   constraint props.
6. `components/challenge-builder.tsx`: new builder UI.
7. [components/game.tsx](../components/game.tsx): constraint props, banner, win
   condition, option filtering, null-distance handling.
8. API: `/api/search`, `competition` on `/api/player`, optional
   `/api/challenge/validate`.
9. [components/header.tsx](../components/header.tsx): "Create Challenge" already points
   to `mode=challenge`; confirm it lands on the builder.

## Verification

- **Build a challenge:** open `/?mode=challenge`, search and pick two players, exclude a
  couple of leagues, set a waypoint and an excluded player, confirm the generated URL
  contains the right `from/to/via/not_player/not_leagues` ids and codes.
- **Solvability warning:** construct constraints with no path (e.g. exclude the only
  bridging player) and confirm the builder warns but still produces a link.
- **Solve:** open the generated link; confirm the constraint banner lists the excluded
  leagues, waypoint, and excluded player; confirm the excluded player and
  excluded-league club-seasons never appear as options; confirm a path that skips the
  waypoint does **not** win and one through it does.
- **Par and rating:** confirm `solutionDistance` equals `dist(origin→via)+dist(via→target)`
  and the win modal rating matches, exactly as Daily.
- **Identity:** confirm a link built from ids resolves to the correct names on load.
