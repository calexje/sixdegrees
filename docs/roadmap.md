# Roadmap

Planned work from early player feedback. The recurring theme: generated puzzles
were either trivial (two players from the same club) or used players so obscure
they were ungettable. The fixes below make Daily reliably solvable, stop trivial
puzzles, and turn Practice into a fully configurable generator.

Decisions already taken with the owner are marked **[decided]**.

## 1. Floor of 2 jumps — no trivial puzzles

**Problem:** Practice could produce 1-jump puzzles (e.g. Tonali → Donnarumma,
both at Milan). The fun is linking players who *didn't* play together.

- **[decided]** Generated puzzles must be **at least 2 jumps (4 moves)** apart.
  A 2-jump puzzle guarantees the endpoints never shared a club (they're linked
  through an intermediate player).
- Daily (2-6 jumps) and Expert (6) already satisfy this; the change is really
  about **Practice**, which currently targets exactly 1 jump.
- On generation, if no target exists at/above the floor for a chosen origin,
  **retry with a new origin** rather than falling back below the floor.
- Touch: `lib/puzzle.tsx` (`generatePuzzle` floor + retry; raise Practice's
  distance).

## 2. Player prominence (obscurity 1-5)

**Goal:** gate Daily to recognizable players, and power the Practice obscurity
slider (#3).

- **[decided] Metric = top-flight longevity, not market value.** Market value
  favours young hype (a 20-year-old at £100M with one club) and undervalues the
  well-travelled veterans who are actually famous *because* they played a lot,
  for a lot of teams (Ronaldo, Milner). Count of seasons in the Big-5 top
  flights (`GB1, ES1, IT1, L1, FR1`) is a far better fit and matches the data:

  | Player | Top-5 seasons | Prominence |
  |--------|---------------|------------|
  | James Milner | 24 | 5 |
  | Cristiano Ronaldo | 20 | 5 |
  | Lionel Messi | 19 | 5 |
  | Casemiro | 13 | 5 |
  | Sandro Tonali | 7 | 3 |

- Proposed 1-5 prominence buckets by top-5-league season count:
  `≥12 → 5`, `8-11 → 4`, `5-7 → 3`, `3-4 → 2`, `≤2 → 1`.
  Obscurity is the inverse (obscurity 1 = prominence 5).
- **Daily gate:** both endpoints must be prominence ≥ 3 (≥5 top-flight seasons).
  Expert stays ungated — that's the point of Expert.
- **Known limitation:** this is establishment, not audience-specific fame. It
  can't know that Nemanja Gudelj is well known to Spanish/Dutch/Portuguese fans
  but obscure to an English audience — modelling that would need per-region
  data we don't have. Accepted as a rough but serviceable global proxy.
- Implementation: precompute prominence per player (cheapest as a column/table
  written during `scripts/import.ts`, or a one-time query at module load into a
  `name → prominence` map). The graph is name-keyed, so gating filters player
  nodes by that map. Touch: `scripts/import.ts` or `lib/db.ts`, `lib/puzzle.tsx`.

## 3. Practice → fully configurable generator

**[decided]** Practice becomes "a configurable Challenge": the player sets the
constraints and generates a random puzzle within them. Controls:

- **League filter** — multi-select, reusing the Challenge builder's league UI.
- **Season range** — e.g. Big-5, post-2008 (a from/to).
- **Obscurity slider (1-5)** — the minimum prominence allowed, from "household
  names only" to "anything goes", built on #2.
- Plus the 2-jump floor from #1.

- Mechanics: filters drive generation via URL params
  (`?mode=practice&leagues=…&from=2008&obscurity=3`) with a **"New puzzle"**
  button. Filtered graphs are cached by key, the same pattern as Challenge.
- New work needed:
  - **Season filtering** in `getAllAppearances` / `buildGraph` (we already have
    league filtering; add a season min/max — store season as a comparable int).
  - A Practice config panel (client) — largely the Challenge builder's controls
    minus the player pickers, plus the slider.
  - Wire the params through `app/page.tsx` and `generatePracticePuzzle`.

## 4. Expert tab unselectable on mobile — resolved

The "couldn't choose Expert" report predates the navigation fixes. With the
optimistic tab highlight and the "Building player database…" message, the tab
now responds immediately. No further action; keep an eye out for repeat reports.

## Suggested sequence

1. **#1 floor** — small, immediate quality win.
2. **#2 prominence** — precompute + Daily gate; unblocks the slider.
3. **#3 Practice config** — season filtering + UI; builds on #1 and #2.
4. **#4** — done.

## Notes / risks

- Prominence is best precomputed at import so generation stays fast; a runtime
  `GROUP BY` over all appearances on every Daily would be wasteful.
- Season filtering assumes `season` is stored/compared as an integer year (it's
  currently text like `"2003.0"` — cast on read or store an int column).
- Gating Daily shrinks its pool; confirm enough prominence-≥3 PL pairs exist at
  each target distance (they will, but worth a sanity check during build).
