// Seasons are stored as floats like "2003.0"; show them as plain years.
export function formatSeason(season: string): string {
  return season.split(".")[0];
}
