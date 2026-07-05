// Player prominence is measured by distinct seasons in the Big-5 top flights
// (GB1/ES1/IT1/L1/FR1). Fixed buckets, validated against the data, give a clean
// pyramid (most players at the bottom). We deliberately avoid market value
// (favours young hype) and recency (skews the distribution and punishes retired
// legends); this is "top-flight career length", honestly labelled as such.
//
// Bucket (prominence):  5: 11+   4: 6-10   3: 3-5   2: 1-2   1: 0 seasons

// Practice obscurity slider. Each step is the FLOOR of prominence allowed: the
// minimum top-flight seasons a player needs to appear. 5 = no gate (anyone).
export const OBSCURITY_MIN_SEASONS: Record<
  number,
  number | undefined
> = {
  1: 11,
  2: 6,
  3: 3,
  4: 1,
  5: undefined,
};

// Describes the least-prominent player included at each slider step, rather
// than claiming a level of "fame" the data can't measure.
export const OBSCURITY_LABELS: Record<number, string> = {
  1: "Top-flight stalwarts",
  2: "Top-flight regulars",
  3: "Established top-flighters",
  4: "Any top-flight player",
  5: "Anyone (incl. lower leagues)",
};

// The Daily gates its two endpoints asymmetrically. The target must be clearly
// well-known (its career is what hints reveal). The origin is deliberately
// looser: fame correlates with connectivity, so a less-famous origin is what
// sits a genuine 3-4 jumps from a famous target on the full graph. Both are
// still Premier League players, so the puzzle stays recognisable at both ends;
// the origin is just a more modest name. Values are minimum distinct top-flight
// seasons (buckets above: 6-10 well-established, 3-5 a solid regular, 1-2 a
// squad player).
export const DAILY_ORIGIN_MIN_TOP_FLIGHT_SEASONS = 2;
export const DAILY_TARGET_MIN_TOP_FLIGHT_SEASONS = 8;
