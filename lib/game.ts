// Move budget: a puzzle can be failed if the player exceeds the optimal move
// count by more than this slack. Mirrors Travle's "optimal + 4". Flat, not
// proportional: short puzzles are easy by definition, so a generous relative
// overage there is fine.
export const MOVE_SLACK = 4;
