/**
 * Daily streak + completion stats, tracked per-player (persisted by the app
 * layer, e.g. localStorage). Pure and browser-API-free so it can be unit
 * tested like the rest of the engine.
 *
 * There is no "loss" state in Word Golf (no move cap), so stats track
 * completions, streaks, and a moves-distribution histogram rather than a
 * win/loss rate.
 */

export interface DailyStats {
  /** Total number of distinct daily puzzles completed. */
  totalCompleted: number;
  /** Current consecutive-day completion streak. */
  currentStreak: number;
  /** Highest streak ever reached. */
  maxStreak: number;
  /** UTC date string (YYYY-MM-DD) of the most recently completed daily, or null. */
  lastCompletedDateUtc: string | null;
  /** moves -> number of completed dailies solved in exactly that many moves. */
  moveCounts: Record<number, number>;
}

export interface RecordDailyCompletionResult {
  stats: DailyStats;
  /**
   * True when this completion represents a *subsequent* day's daily (i.e. the
   * player had already completed a different, earlier daily before). This is
   * exactly what the `daily_returned` guarded-release metric measures.
   */
  isReturn: boolean;
}

export function createInitialStats(): DailyStats {
  return {
    totalCompleted: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastCompletedDateUtc: null,
    moveCounts: {},
  };
}

/** Whole-day difference between two UTC date strings (YYYY-MM-DD), b - a. */
function daysBetweenUtc(a: string, b: string): number {
  const aMs = Date.parse(`${a}T00:00:00Z`);
  const bMs = Date.parse(`${b}T00:00:00Z`);
  return Math.round((bMs - aMs) / 86_400_000);
}

/**
 * Record a completed daily puzzle for `dateUtc` (YYYY-MM-DD), solved in
 * `moves` moves. Idempotent for repeat calls with the same `dateUtc` (e.g. a
 * player replaying an already-solved daily via "Play again") — the returned
 * stats are unchanged and `isReturn` is false.
 */
export function recordDailyCompletion(
  stats: DailyStats,
  dateUtc: string,
  moves: number
): RecordDailyCompletionResult {
  if (stats.lastCompletedDateUtc === dateUtc) {
    // Same day already recorded — no-op to avoid double counting.
    return { stats, isReturn: false };
  }

  const isReturn =
    stats.lastCompletedDateUtc !== null &&
    stats.lastCompletedDateUtc !== dateUtc;

  const isConsecutive =
    stats.lastCompletedDateUtc !== null &&
    daysBetweenUtc(stats.lastCompletedDateUtc, dateUtc) === 1;

  const currentStreak = isConsecutive ? stats.currentStreak + 1 : 1;
  const maxStreak = Math.max(stats.maxStreak, currentStreak);
  const moveCounts = {
    ...stats.moveCounts,
    [moves]: (stats.moveCounts[moves] ?? 0) + 1,
  };

  return {
    stats: {
      totalCompleted: stats.totalCompleted + 1,
      currentStreak,
      maxStreak,
      lastCompletedDateUtc: dateUtc,
      moveCounts,
    },
    isReturn,
  };
}
