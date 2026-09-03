// Player obscurity is a 1-5 rank built by scripts/build-obscurity.ts, 1 being
// the most recognisable. Design and rationale in docs/roadmap.md.

// Practice slider: the level is the rank ceiling. 5 = no gate.
export const OBSCURITY_MAX_RANK: Record<
  number,
  number | undefined
> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: undefined,
};

export const OBSCURITY_LABELS: Record<number, string> = {
  1: "Household names",
  2: "Well known",
  3: "Known to regular fans",
  4: "Deep cuts",
  5: "Anyone (incl. lower leagues)",
};

// Asymmetric by design: the target is the name the player has to get, the
// origin is looser because a less famous origin is what sits 3-4 jumps away.
// ~880 targets, ~5,800 origins. Most likely thing to want tuning.
export const DAILY_ORIGIN_MAX_RANK = 4;
export const DAILY_TARGET_MAX_RANK = 2;
