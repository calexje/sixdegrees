// Daily-puzzle stats persisted in localStorage. Only the Daily mode touches
// these; each calendar day counts once.
export type Stats = {
  gamesPlayed: number;
  currentStreak: number;
  lastPlayed: string | null; // YYYY-MM-DD of the last completed Daily
};

const KEY = "footballDegrees:dailyStats";
const RESULT_KEY = "footballDegrees:dailyResult";

// The most recent completed Daily, for the lock-until-tomorrow screen.
export type DailyResult = {
  date: string;
  moves: number;
  hints: number;
};

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

// Read-only stats for the result screen.
export function loadStats(): Stats {
  return load();
}

// The Daily result is stored for the latest day played; returned only when it
// matches `today` (i.e. the player has already finished today's Daily).
export function getDailyResult(
  today: string
): DailyResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.date !== today) return null;
    return {
      date: parsed.date,
      moves: Number(parsed.moves) || 0,
      hints: Number(parsed.hints) || 0,
    };
  } catch {
    return null;
  }
}

export function recordDailyResult(result: DailyResult) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RESULT_KEY,
      JSON.stringify(result)
    );
  } catch {
    // ignore (private mode / disabled storage)
  }
}
