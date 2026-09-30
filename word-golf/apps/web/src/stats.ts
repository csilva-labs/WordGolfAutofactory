import { createInitialStats, type DailyStats } from "@word-golf/engine";

const STATS_STORAGE_KEY = "word-golf:daily-stats:v1";

/**
 * Load persisted daily stats from localStorage. Falls back to a fresh
 * `createInitialStats()` on any error — missing key, corrupt JSON, storage
 * disabled (e.g. private browsing) — so a storage problem can never break
 * gameplay.
 */
export function loadStats(): DailyStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return createInitialStats();
    const parsed = JSON.parse(raw) as Partial<DailyStats>;
    return { ...createInitialStats(), ...parsed };
  } catch {
    return createInitialStats();
  }
}

/**
 * Persist daily stats to localStorage. Swallows any error (quota exceeded,
 * storage disabled) — telemetry/persistence must never affect gameplay.
 */
export function saveStats(stats: DailyStats): void {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // intentionally swallowed — persistence must not affect gameplay
  }
}
