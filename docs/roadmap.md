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

- **Daily gate:** both endpoints must be prominence ≥ 3 (≥3 top-flight seasons).
  Expert stays ungated — that's the point of Expert.
- **Known limitation (accepted):** this is top-flight career length, not
  audience-specific fame. It can't know Nemanja Gudelj is well known to
  Spanish/Dutch/Portuguese fans but obscure to an English one, and it ranks
  one-club greats by longevity (Mikel Aranburu lands near the top — he's
  Sociedad's Gerrard). The honest fix was labelling the buckets by what they
  measure rather than claiming "fame".
- **Implementation:** a memoised `getProminentPlayerNames(minSeasons)` query in
  `lib/db.ts` (no import-time column needed); thresholds, labels and the Daily
  gate live in `lib/prominence.ts`; gating filters the name-keyed graph in
  `lib/puzzle.tsx`.

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
