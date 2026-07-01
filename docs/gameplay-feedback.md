# Gameplay feedback: onboarding, peril, and the back button

Source: playtest feedback from a first-time player (via the F1 conversation).
Three themes, all pointing at the same gap: the game is currently frictionless
in the wrong ways. It doesn't explain itself, and it can't be failed, so the
daily stakes that make Wordle/Travle/Connections sticky aren't there.

Reference points the tester cited:
- Wordle: 6 guesses total.
- Connections / 4x3 (Hank Green): 3 wrong guesses.
- Travle: budget of `optimal + 4` moves, plus a first-load tutorial and
  on-track/off-track feedback after each guess.

Quote: "People can't fail footylinks at the moment." That's the core of items 2
and 3 below.

## Current mechanics (for reference)

From `components/game.tsx`:
- `path` is the built chain, starting at the origin player. `current` is the
  last node.
- `moveCount = path.length - 1` (each selection is one move; a jump
  player -> club -> player is two moves).
- `solutionDistance` is the optimal length **in moves**, already computed and
  shown as "N moves apart" in the header and "the shortest solution was N moves"
  in the win modal.
- `goBack()` removes the last node; the Back button is always visible, only
  disabled at the origin.
- `filteredOptions` already drops nodes already in the path, so a player whose
  every club-season is used produces an empty option list.
- Winning locks the Daily for the day (`stats.ts`: `recordDailyWin`,
  `recordDailyResult`, `getDailyResult`), and `DailyResult` shows the recap.

---

## 1. First-run tutorial

**Problem.** "It took me a while to figure out what it wanted me to do." There is
no onboarding; a new player is dropped straight onto the board.

**Behaviour (decided).**
- Auto-open once, on the first ever visit to the site, on **any** mode. Gate on
  a single localStorage flag (`footylinks:onboarded`); once the player closes it
  it never auto-opens again, in any mode.
- A persistent "?" button, present everywhere (header), reopens the same modal
  on demand.

**Layout (following the Travle screenshots).** A modal titled "? How to Play"
with an X and a Done button, laid out as:
- A compact visual of the mechanic at the top: origin player -> club-season ->
  teammate -> target, in the app palette (static is fine for v1; animate later).
  Travle's equivalent is the pink/teal/grey hexagon demo.
- A one-line summary beneath it: "Connect the two players through clubs they
  shared. Get there in the fewest moves."
- Collapsible accordion sections, mirroring Travle's (Scoring / Borders /
  Credits):
  1. **Scoring** — how the result is rated (Perfect / Excellent / … from moves
     vs optimal), the move budget and that you can run out of moves (item 2),
     and that each hint counts against the result. If per-guess feedback ships
     (see below), its colour key lives here, exactly as Travle's does.
  2. **How links work** — origin player, pick one of their club-seasons, pick a
     teammate from that squad, repeat to the target; which leagues/seasons are
     in the dataset; the dead-end Back behaviour (item 3).
  3. **Credits & data** — Transfermarkt attribution and the fan-project note
     (mirror `/about`).
- A link to `/about` as the "more info / FAQ" out, and the Done button.

**Files.** New `components/tutorial.tsx` (client), a mount check (layout or
board), the "?" header button, one localStorage key. No server work.

---

## 2. Failure mode + move budget

**Problem.** The move count grows without limit, so there's no way to lose and
no tension. This is the headline change.

**Mechanic (recommended).** Give each puzzle a move budget:

```
budget = solutionDistance + SLACK
```

- `SLACK` = **4 moves** (two extra jumps), mirroring Travle's `optimal + 4`.
  Decided: flat, not proportional. A short puzzle is easy by definition, so a
  generous relative overage there is fine; the constant stays a single tunable.
- The player may make up to `budget` moves. Reaching the target on move
  `<= budget` is a win. If `moveCount` hits `budget` without a win, the puzzle is
  **failed** and the board locks.
- `failed = !won && moveCount >= budget`. On the move that reaches `budget`,
  check for a win first; if not won, enter the failed state and stop accepting
  selections.

**Counter semantics (decided: simple).** The budget metric and the score are the
same single number, `moveCount = path.length - 1`. Backing out of a dead end
(item 3) removes that node and refunds the move; escaping a dead end is not a
penalty. Peril is preserved by item 3 alone: because Back only exists at dead
ends, a productive-but-suboptimal move can't be freely undone to trim the path
back toward optimal, so the count only falls when the player was genuinely
forced to reverse. Reaching a dead end still costs the moves spent getting
there, so there's no way to lower the count below real progress.

*Rejected:* a non-refunding `movesSpent` counter, or counting each Back as its
own move. Both punish escaping a dead end, which is unintuitive, and add a
second number to explain.

**UI (this is the tester's "show both lengths").**
- Replace the bare "Your path (N moves)" with a budget-aware readout, e.g.
  `Moves: 5 / 10` alongside the already-shown optimal (`optimal: 6`). Show all
  three: moves used, budget, optimal.
- As `moveCount` approaches `budget`, warn (colour shift on the last one or two
  moves) so the peril is visible, not a surprise.

**Failed state.**
- A fail modal mirroring the win modal: "Out of moves" heading, the route the
  player built, the "Show optimal route" reveal (reuse `solutionPath` /
  `showOptimal`), and the stats block.
- Share text variant: something like `I couldn't connect X to Y in N moves`
  rather than the success string in `copyResults` / `daily-result.tsx`.

**Stats / streak (`lib/stats.ts`).**
- `DailyResult` gains a `solved: boolean` field.
- A Daily loss breaks the streak (`currentStreak -> 0`) but still increments
  `gamesPlayed`, and still locks the day. Today's `recordDailyWin` logic needs a
  matching loss path (either a `recordDailyLoss` or a unified
  `recordDailyResult({ solved })`).
- `DailyResult` (the locked recap) needs a failed variant (not just
  "✅ Solved").

**Non-Daily modes.** Expert/Practice/Challenge should apply the same budget so
the rules are consistent, but without touching streak stats (those are
Daily-only today).

---

## 3. Back button only at dead ends

**Problem.** Back is always available, which makes it a free undo. Combined with
the new budget, a free undo would let players trim their way out of trouble and
defeat the peril.

**Behaviour.** Show the Back control **only when the current node is a player
with no unused club-seasons** (every club-season under them is already in the
path), i.e. `current.type === "player"` and the visited-filtered option set is
empty. Otherwise hide it entirely. This turns Back from a general undo into a
dead-end escape hatch.

**Implementation note.** `filteredOptions` also applies the search query, so
compute a separate visited-only set for this test (don't let an active search
box make the board look like a dead end). One `goBack()` from a dead-end player
lands on the club-season above it, where the player can pick a different
teammate, so a single step is enough to escape.

**Both node types (decided).** Show Back whenever the current node has no unused
onward options, whether that's a player with every club-season used or a
club-season with every squad member used. The latter is rare for a 25-man
Premier League squad but common for sparse groups (thin motorsport team-seasons,
small-squad leagues), so the rule keys on "no unused onward options", not on node
type.

---

## 4. Per-guess feedback (in scope)

Mirrors the Travle "Scoring" panel and the tester's "tell you if your guess is
on track once made". Three design constraints fall out of our structure and they
matter more than the feature itself.

**Compute cost: one BFS from the target, not all-pairs.** We never need
node-to-node distances for every pair (that's O(V^2)). We need distance-to-target
for every node, which is a single BFS *from the target* (O(V+E)). Colouring any
node is then an O(1) lookup. Compute it once per puzzle and cache it in memory,
keyed by mode + target + constraints. It's the same traversal `/api/hint`
already runs, so cache it once and have hints and colours share it. The map
stays server-side (it covers every node, far too big to ship); the client learns
a colour, not the map.

**Colour committed moves, not the option list.** This is the make-or-break rule.
If we tint the selectable options (Wigan green, Almeria red), the puzzle
collapses into "click the green one" — we've shown the answer. Travle colours a
guess *after* it's committed. So we colour each node once it's in the path, in
the path/history view, never the choices. With Back restricted to dead ends
(item 3) the player can't shop around, so this stays honest and keeps the peril.
Implementation: when we fetch the options for the newly-current node, return that
node's own distance-to-target in the same response, and colour the move just
made. No extra round-trip, and no option is ever pre-graded.

**Two colours, not four — the graph can't support more.** The graph is strictly
bipartite (player -> club-season -> player) and unweighted, so from any node
every neighbour is *exactly* one step closer or one step further; there is no
middle ground at a single hop. Worked example: Crusat is 4 moves from Ramage, so
each of his club-seasons is either distance 3 (on a shortest path) or distance 5
(off it) — never 4. Two non-optimal clubs of the same player are both 5, so a
red-vs-orange split among them isn't real, it's an artefact of the illustration.
Travle has four colours only because you can guess *any* country and guesses land
at varied distances; here you can only pick a neighbour. So:
- **Green** — the move kept you on a shortest path (distance fell by 1).
- **Amber** — the move left the shortest path (distance rose by 1).
- Optional **grey** — the move leads into a branch from which the target is
  unreachable within the remaining budget (distance is effectively infinite).

To give the gradation the owner wants without inventing colours the graph can't
justify, show the resulting number alongside the colour, e.g. "now 5 from target
(best was 3)". The number carries the nuance; the colour stays truthful.

**Residual tension to accept.** Post-commit feedback still eases navigation and
overlaps with the paid "Next move" hint. Judged acceptable: it's after the fact,
it can't be shopped against, and the number-plus-colour is information, not a
solution. Revisit if it makes puzzles feel automatic.

## Suggested build order

1. Back button restriction (item 3) — small, and it's a prerequisite for the
   budget to hold under the simple counter.
2. Move budget + failed state + UI readout (item 2) — the main change; touches
   `game.tsx`, `stats.ts`, `daily-result.tsx`.
3. Per-guess feedback (item 4) — builds on the cached BFS-from-target; server
   returns the current node's distance with its options, client colours the
   committed move. Naturally follows item 2's UI work.
4. First-run tutorial (item 1) — independent, can land any time; align visuals
   to the Travle screenshots.

## Decisions

Resolved:
- `SLACK` = flat `+4` moves.
- Counter: simple (`path.length - 1`, dead-end Back refunds, no penalty).
- Tutorial: auto-open once on first-ever visit, any mode; reopen via a "?"
  button available everywhere.

- Dead-end Back: triggers on any node with no unused onward options (players and
  club-seasons alike).
- Per-guess feedback (section 4): in scope. Colour committed moves only, two
  colours (green/amber, optional grey), with the resulting distance shown as a
  number. One cached BFS from the target.

Nothing outstanding; ready to build.
