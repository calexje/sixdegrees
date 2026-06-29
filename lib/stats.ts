// Daily-puzzle stats persisted in localStorage. Only the Daily mode touches
// these; each calendar day counts once.
export type Stats = {
  gamesPlayed: number;
  currentStreak: number;
  lastPlayed: string | null; // YYYY-MM-DD of the last completed Daily
};

const KEY = "footballDegrees:dailyStats";

const EMPTY: Stats = {
  gamesPlayed: 0,
  currentStreak: 0,
  lastPlayed: null,
};

function load(): Stats {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      gamesPlayed: Number(parsed.gamesPlayed) || 0,
      currentStreak: Number(parsed.currentStreak) || 0,
      lastPlayed:
        typeof parsed.lastPlayed === "string"
          ? parsed.lastPlayed
          : null,
    };
  } catch {
    return EMPTY;
  }
}

function save(stats: Stats) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // ignore (private mode / disabled storage)
  }
}

function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Records completion of the Daily for `today` (YYYY-MM-DD). Idempotent: calling
// it again for the same day does not change the stats, so it is safe against
// re-renders and React's double-invoked effects.
export function recordDailyWin(today: string): Stats {
  const stats = load();

  if (stats.lastPlayed === today) {
    return stats;
  }

  const currentStreak =
    stats.lastPlayed === previousDay(today)
      ? stats.currentStreak + 1
      : 1;

  const next: Stats = {
    gamesPlayed: stats.gamesPlayed + 1,
    currentStreak,
    lastPlayed: today,
  };

  save(next);
  return next;
}
