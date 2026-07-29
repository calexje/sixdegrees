// Seasons are stored as floats like "2003.0"; show them as plain years.
export function formatSeason(season: string): string {
  return season.split(".")[0];
}

// A player's tenure at one club, as its contiguous spells so a return to a club
// reads correctly. Robbie Fowler's Liverpool years are "1992–2001, 2005–2006",
// not a single "1992–2006" span that would swallow the seasons he was away (at
// Leeds and Man City). `years` are whole-year seasons in any order; each run of
// consecutive years becomes "first–last" (a single year stays bare), joined
// with commas, most-recent spells last. Empty input yields "".
export function formatTenure(years: number[]): string {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";

  const spells: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  const flush = () =>
    spells.push(start === prev ? `${start}` : `${start}–${prev}`);

  for (let i = 1; i < sorted.length; i++) {
    const year = sorted[i];
    if (year === prev + 1) {
      prev = year;
      continue;
    }
    flush();
    start = year;
    prev = year;
  }
  flush();

  return spells.join(", ");
}
