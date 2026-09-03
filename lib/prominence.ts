// Player obscurity is a 1-5 rank built by scripts/build-obscurity.ts, where 1
// is the most recognisable. It combines Wikipedia language editions — ranked as
// a percentile within the player's era, because coverage grew enormously after
// 2005 and comparing a 1990s career to a current one otherwise compares
// coverage rather than renown — with a cap based on the share of a career spent
// as a regular, which demotes players who accumulated seasons on a bench.
//
// It replaces distinct seasons in the Big-5 top flights, which measured career
// length: that put Scott Carson (13 seasons) and Stéphane Dalmat (14, as many
// as Alan Shearer) in the top bucket, and ranked Mikel Aranburu alongside
// Gerrard — a limitation docs/roadmap.md conceded but could not fix from
// football data alone, because fame is an attention statistic, not a
// performance one.

// Practice obscurity slider. The level IS the rank ceiling: level 1 admits only
// rank 1, level 3 admits ranks 1-3, level 5 admits everyone (no gate).
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

// Describes the least-recognisable player admitted at each step.
export const OBSCURITY_LABELS: Record<number, string> = {
  1: "Household names",
  2: "Well known",
  3: "Known to regular fans",
  4: "Deep cuts",
  5: "Anyone (incl. lower leagues)",
};

// The Daily gates its two endpoints asymmetrically. The target must be clearly
// well-known — its career is what the hints reveal, and it is the name the
// player either gets or doesn't. The origin is deliberately looser: fame
// correlates with connectivity, so a less famous origin is what sits a genuine
// 3-4 jumps from a famous target on the full graph. Both are additionally
// filtered to players with a Premier League appearance, so the puzzle stays
// recognisable to a PL audience at both ends.
//
// As rank ceilings these admit roughly 880 targets and 5,800 origins. The old
// values were counts of top-flight seasons (8 and 2); these were chosen to keep
// the target pool a similar size while now measuring recognisability rather
// than longevity, and are the most likely thing to want tuning.
export const DAILY_ORIGIN_MAX_RANK = 4;
export const DAILY_TARGET_MAX_RANK = 2;
