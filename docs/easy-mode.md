# Spec: Easy mode (club, not year) + difficulty toggle

## Goal

Lower the knowledge tax for casual players. Today every step forces you to pick
a specific club-*season* ("Arsenal (2015)"), but a casual player often knows
"he played for Arsenal" without knowing the year. Easy mode lets them pick the
**club**, not the season.

Built as a **separate mode now** (`?mode=easy`), designed to fold into a future
single Daily with a difficulty toggle (below).

## Core mechanic

- At a player, the board shows their **distinct clubs** (collapsed across
  seasons), not club-seasons.
- Picking a club shows the teammates that player **actually overlapped with**
  at that club, unioned across every season they were there.
- Reaching the target player wins, same as normal.

**Crucial: connectivity is identical to Normal.** Two players still only connect
if they were genuinely teammates in some season — Easy just stops making you
name the year. Concretely, "teammates at club C" is computed from the *current
player's* seasons at C, so a 2010 squad member and a 2015 squad member who never
overlapped still don't connect through C. We are collapsing the *input*, not
loosening the graph.

Why it's easier without being a different puzzle:
- Fewer, more familiar options per step (a player has ~8 clubs vs ~15
  club-seasons).
- No year to guess.
- More forgiving: picking "Arsenal" accepts a teammate from *any* of the
  player's Arsenal seasons, so you're more likely to know one.

It is deliberately **not** a shorter puzzle: because connectivity is unchanged,
the shortest-path distance (and therefore the optimal and the move budget) is
exactly the same as Normal. Easy is an accessibility mode, not an easier target.

## What this means for implementation

Because the player-to-player graph is unchanged, **Easy reuses the same puzzle,
graph and optimal as the Normal daily.** The differences are all input/display:

1. **A new path node type.** Add `{ type: "club", clubId, club }` alongside the
   existing `clubseason` node. Easy-mode paths alternate player → club → player.
   `nodeKeyOf`, the visited-filter, and rendering need to handle it.
2. **Two new option queries** (`lib/db.ts` + API):
   - *Player's clubs*: `SELECT DISTINCT club_id, club_name FROM appearances
     WHERE player_id = ?` (respecting any mode league/season filter).
   - *Player's teammates at a club*: `SELECT DISTINCT player_id, player_name
     FROM appearances WHERE club_id = ? AND season IN (SELECT season FROM
     appearances WHERE player_id = ? AND club_id = ?)`.
3. **Move counting is unchanged.** player → club → player is still two edges
   (one jump), so `moveCount = path.length - 2` and the budget carry over.
4. **Path display collapses the season.** The optimal path is computed on the
   normal club-season graph, then each club-season label is shown as just the
   club name for display (the specific season that made the link still exists
   under the hood; we just don't surface it).

### The one real subtlety: hints and colours

Both operate on graph distance, which is well-defined for **player** nodes but
ambiguous for a collapsed **club** node (which season?). Resolution: score and
hint only at the **player** level. The club node is an input step, not a scored
one. So per-move colour fires when you land on a player (did the distance to
target fall?), and the "next move" hint suggests the next *player* (or the club
that leads to them). This keeps hints/colours consistent with the player-to-
player graph the optimal is computed on (see `docs/graph-consistency.md`).

### Graph-consistency check

Easy's board traverses the same graph as Normal, at club granularity. The
teammates-at-a-club query must use the **same graph the puzzle was solved on**
(for the daily that's the full, all-leagues graph). Enforce the same
league/season constraints on the Easy queries that Normal/Practice apply, or the
optimal can be beaten — the exact trap `docs/graph-consistency.md` describes.

## Separate mode now

- `?mode=easy` serves the **same daily puzzle** as `?mode=daily` (same
  origin/target for the day), rendered with the collapsed board. No new puzzle
  generation.
- Same move budget, same optimal, same win/fail/hints (player-level).
- A small toggle/link between Daily and Easy so players can switch.

## Future: one Daily, a difficulty toggle

Collapse the mode list into a single **Daily** with a difficulty control:

| Difficulty | Puzzle | Board |
|---|---|---|
| Easy | the daily puzzle | club-collapsed (this spec) |
| Normal (default) | the daily puzzle | club-season (today's behaviour) |
| Hard | the **Expert** puzzle (all leagues, harder) | club-season |

Easy and Normal share the same puzzle and differ only in board granularity; Hard
swaps in the harder Expert puzzle. The toggle lives on the board/header and
persists the player's choice (localStorage), defaulting to Normal.

Note: this replaces the current top-level Daily / Expert split with Daily +
difficulty, so Expert becomes "Daily on Hard". Practice and Create stay separate
modes.

## Open decisions

- Does Easy get extra move slack, or the same budget as Normal? (Recommend same:
  it's already more forgiving, and a shared budget keeps scores comparable.)
- Toggle placement and whether switching mid-puzzle is allowed, or only at load.
- Whether Hard-as-Expert keeps its own streak, or the daily streak spans
  whatever difficulty you played that day.