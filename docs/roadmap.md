# Roadmap

Work driven by early player feedback. The recurring theme: generated puzzles
were either trivial (two players from the same club) or used players so obscure
they were ungettable. These changes make Daily reliably solvable, stop trivial
puzzles, and turn Practice into a fully configurable generator.

All four items below are **shipped**; this doc now records what was built and
why (including approaches we tried and rejected).

## 1. Floor of 2 jumps — no trivial puzzles ✅

**Problem:** Practice produced 1-jump puzzles (e.g. Tonali → Donnarumma, both at
Milan). The fun is linking players who *didn't* play together.

- Generated puzzles are now **at least 2 jumps (4 moves)** apart. A 2-jump
  puzzle guarantees the endpoints never shared a club (linked via an
  intermediate player).
- Generation **retries with a new origin** rather than falling back below the
  floor, so it can never serve a same-club pair.
- `MIN_JUMPS = 2` in `lib/puzzle.tsx`; Practice's target raised to 2 jumps.
  Daily (2-6) and Expert (6) already cleared the floor.

## 2. Player prominence (obscurity 1-5) ✅

**Goal:** gate Daily to recognizable players, and power the Practice obscurity
slider (#3).

**Metric = top-flight longevity.** Distinct seasons in the Big-5 top flights
(`GB1, ES1, IT1, L1, FR1`). We tried and rejected the alternatives:

- *Market value* — favours young hype (a £100M 20-year-old) and undervalues the
  well-travelled veterans who are famous *because* they played a lot, for a lot
  of teams. Rejected.
- *Breadth × longevity (clubs × leagues × seasons)* — multiplying tanks one-club
  legends: Gerrard and Maldini scored **below** journeymen, and it didn't even
  separate the players it was meant to. Rejected.
- *Recency division (`seasons·top5 / (today−last)`)* — skews the distribution so
  hard that ~60% of players tie at zero and every recognizable name piles into a
  single quantile, while sinking retired legends. Unbucketable. Rejected.

Fixed thresholds on top-flight seasons were the only thing that buckets cleanly
(validated against the data — a proper pyramid):

| Prominence | Top-flight seasons | Players |
|-----------:|--------------------|--------:|
| 5 | 11+ | 2,314 |
| 4 | 6–10 | 4,576 |
| 3 | 3–5 | 7,036 |
| 2 | 1–2 | 15,826 |
| 1 | 0 (lower-league / cup only) | 27,551 |

### Superseded, September 2026 — obscurity rank

The table above is history. Career length was never fame, and the limitation
this section used to concede — "Mikel Aranburu lands near the top, he's
Sociedad's Gerrard" — is now fixed: Aranburu is rank 5, Gerrard rank 1.

The replacement is a 1-5 **obscurity rank** built offline by
`scripts/build-obscurity.ts` into a `player_obscurity` table, where 1 is the
most recognisable:

- **Fame does the ranking.** Wikipedia language editions per player
  (`scripts/fetch-fame.ts`), taken as a percentile within the player's *era*
  cohort. Coverage grew enormously after 2005 and active players attract
  continuous editing, so an absolute count would rank Rashford above Shearer —
  comparing coverage, not renown. Era cohorts remove that.
- **Regularity only caps it.** Season-equivalents (minutes / 1800, capped at 1
  per season) over seasons present, i.e. the *share* of a career spent
  actually playing. This is a filter, not a second ranking dimension: nearly
  every real player is a regular 80-100% of the time, so ranking on it
  amplifies noise. Below 0.75 it caps a player at rank 3, below 0.5 at rank 4.
  Scott Carson at 0.60 is what it exists to catch.
- **Qualification:** ≥3 top-flight seasons. Everyone else is rank 5, because
  ranking all 62,713 players together puts anonymous ones in the top band.
- **Pyramid:** 383 / 500 / 1,874 / 3,068 / 8,718 qualified, plus 48,170
  unqualified at rank 5.
- **Daily gate:** asymmetric — target ≤ rank 2, origin ≤ rank 4. The target is
  what the hints reveal and must be gettable; the origin is deliberately
  looser, since a less famous origin is what sits a genuine 3-4 jumps away.
  Expert stays ungated — that's the point of Expert.
- **Implementation:** `getPlayerIdsByMaxRank(maxRank)` in `lib/db.ts`; the
  slider level *is* the rank ceiling, so `OBSCURITY_MAX_RANK` in
  `lib/prominence.ts` is an identity map; gating filters the graph in
  `lib/puzzle.tsx`.

Still true, and not fixable from football data: it cannot know Nemanja Gudelj
is well known to Spanish, Dutch and Portuguese fans but obscure to an English
one. Wikipedia editions are a global average, not an audience-specific one.

Two things to know about the inputs:

- Minutes are only 86-92% complete for 1990-2001 and missing values count as
  zero, so pre-2002 players' regularity is understated and they sit closer to
  the cap than they should.
- The position cohort does not currently affect the rank. Regularity became a
  cap rather than a ranked percentile, so `positionGroupOf` and `minutes_pct`
  are computed and stored but nothing reads them. Kept deliberately: the
  original justification (a 47.8% vs 41.9% full-season rate) came from one
  competition-season and does not hold — across the full dataset the gap is
  41.1% vs 39.4%, 1.7 points rather than 6 — but the question that matters is
  how many players at each position are well known, which has not been measured
  either way. The stored percentile is what that analysis would start from.

## 3. Practice → fully configurable generator ✅

Practice is now "a configurable Challenge": the player sets constraints and
generates a random puzzle within them.

- **League filter** — multi-select with All/None.
- **Season range** — from/to year inputs (e.g. Big-5, post-2008).
- **Obscurity slider (1-5)** — minimum prominence to include, from
  "Top-flight stalwarts" to "Anyone (incl. lower leagues)", built on #2.
- Plus the 2-jump floor from #1.

- **Mechanics:** filters drive generation via URL params
  (`?mode=practice&leagues=…&from_season=2008&to_season=2025&obscurity=3`) with a
  **"New puzzle"** button (refreshes when filters are unchanged, navigates when
  changed). Filtered graphs are cached by key and bounded, like Challenge.
- **Built:** league/season filtering + `getSeasonBounds` in `lib/db.ts` and
  `buildGraph`; `generatePracticePuzzle(filters)` + a bounded practice-graph
  cache in `lib/puzzle.tsx`; a `PracticeConfig` client panel; wiring in
  `app/page.tsx`.

## 4. Expert tab unselectable on mobile — resolved ✅

The "couldn't choose Expert" report predated the navigation fixes. With the
optimistic tab highlight and the "Building player database…" message, the tab
responds immediately. No further action.

## Notes

- `season` is stored as text like `"2003.0"`; range filtering casts on read
  (`CAST(season AS REAL)`). A stored integer column would be marginally faster
  if it ever matters.
- Prominence is a memoised runtime query rather than an import-time column —
  cheap enough, and avoids a re-import. Move it to import if the startup cost
  ever shows up.

## Possible next steps (not planned)

- A distance/difficulty control for Practice (currently fixed at the 2-jump
  floor) so players can choose harder chains.
- Recency as a gentle tiebreaker (not a divisor) if Daily ever feels too
  weighted toward retired players.
