# The graph-consistency invariant

**The board must let the player traverse exactly the graph the puzzle's optimal
was computed on. No more, no less.**

If the board allows a route the solver's graph didn't contain, the player can
beat the "shortest solution" the game shows them. In a game that's explicitly
about knowledge, "optimal is 6 moves" when it's solvable in 4 doesn't read as a
clever shortcut, it reads as the game miscalculating. That erodes trust, so this
invariant is not optional.

## Where each side of the invariant lives

- **Solve graph** (what the optimal, hints and colours run on):
  - `generatePuzzle(graph, …)` / `generateDailyPuzzleForSeed` / `getPracticeGraph`
    / `getChallengeGraph` in `lib/puzzle.tsx` build the graph and compute
    `solutionDistance` / `solutionPath`.
  - `getGraphForMode(mode, notLeagues)` and `getTargetDistances(...)` decide the
    graph that `/api/hint` (next-move) and `/api/distance` (green/amber colours)
    search. These must be the same graph.
- **Play graph** (what the player can actually traverse): the option filters in
  `loadOptions` in `components/game.tsx`. Whatever those filters allow *is* the
  graph the player plays on.

The bug is always the same shape: these two drift apart.

## How each mode satisfies it

| Mode | Solve graph | Board held to it by |
|---|---|---|
| Daily | Full graph (endpoints are PL players, but routing is unrestricted) | Nothing to restrict — board is full graph too |
| Expert | Full graph | Nothing to restrict |
| Practice | Filtered: `includeLeagues` + `seasonFrom`/`seasonTo` | `includeLeagues` / `seasonFrom` / `seasonTo` props filter the options |
| Challenge (Create) | Full minus `notLeagues`, `excludedPlayer` blocked, forced through `via` | `notLeagues` + `excludedPlayerId` option filters, and the `passedWaypoint` win condition |

Note the asymmetry that caused the two historical bugs: Daily/Expert solve on the
*full* graph, so the board needs no restriction. Practice and Challenge solve on
a *narrower* graph, so the board must be narrowed to match.

## The two times this broke (so it's recognisable)

1. **Daily, PL-vs-full.** Daily was solved on the Premier-League-only graph but
   played on the full dataset, so a cross-league shortcut (e.g. via a Bundesliga
   club) beat the stored optimal. Fixed by solving the Daily on the **full**
   graph (PL only gates endpoint *selection*, not routing).
2. **Practice, filter-vs-play.** A `leagues=GB1` puzzle was solved on the GB1
   graph but the board showed every club, so a route through a non-GB1 club beat
   the optimal. Fixed by passing the practice filters to the board
   (`includeLeagues` / `seasonFrom` / `seasonTo`) so options stay inside the
   filter.

Challenge never broke because its constraints are exclusions (`notLeagues`,
`excludedPlayer`) that were always passed to the board and enforced in options,
hints and colours alike.

## Checklist when adding a mode (or cloning to a new sport)

1. Write down the graph the optimal is computed on (which leagues/competitions,
   which seasons, which blocked nodes, any forced waypoint).
2. Make `loadOptions` filter the board's options to that exact graph. Every
   restriction on the solve graph needs a matching restriction here.
3. Make `/api/hint` and `/api/distance` search that same graph (via
   `getGraphForMode` + the `not_leagues` / `not_player` params, or the mode's
   equivalent).
4. Verify empirically: pick a real generated puzzle, play a route by hand, and
   confirm you **cannot** reach the target in fewer moves than the shown
   optimal. If you can, the two graphs have drifted.
