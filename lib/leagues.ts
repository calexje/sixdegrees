// Maps competition codes (as stored in the appearances table) to display names.
// The available codes are derived from the database at runtime via
// getCompetitions(); this table only provides their human-readable labels.
export const LEAGUE_NAMES: Record<string, string> = {
  GB1: "Premier League",
  GB2: "Championship",
  ES1: "La Liga",
  ES2: "Segunda División",
  IT1: "Serie A",
  IT2: "Serie B",
  L1: "Bundesliga",
  L2: "2. Bundesliga",
  FR1: "Ligue 1",
  FR2: "Ligue 2",
  PO1: "Primeira Liga",
  PO2: "Liga Portugal 2",
};

export function leagueName(code: string): string {
  return LEAGUE_NAMES[code] ?? code;
}
