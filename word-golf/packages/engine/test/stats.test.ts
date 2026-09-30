import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialStats, recordDailyCompletion } from "../src/stats.js";

test("createInitialStats starts at zero with no last-completed date", () => {
  const stats = createInitialStats();
  assert.deepEqual(stats, {
    totalCompleted: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastCompletedDateUtc: null,
    moveCounts: {},
  });
});

test("first completion is not a return and starts a streak of 1", () => {
  const { stats, isReturn } = recordDailyCompletion(
    createInitialStats(),
    "2024-06-18",
    5
  );
  assert.equal(isReturn, false);
  assert.equal(stats.totalCompleted, 1);
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.maxStreak, 1);
  assert.equal(stats.lastCompletedDateUtc, "2024-06-18");
  assert.deepEqual(stats.moveCounts, { 5: 1 });
});

test("replaying the same day's daily is idempotent (no double count)", () => {
  const first = recordDailyCompletion(createInitialStats(), "2024-06-18", 5);
  const second = recordDailyCompletion(first.stats, "2024-06-18", 7);
  assert.equal(second.isReturn, false);
  assert.deepEqual(second.stats, first.stats);
});

test("consecutive UTC day increments the streak", () => {
  const day1 = recordDailyCompletion(createInitialStats(), "2024-06-18", 5);
  const day2 = recordDailyCompletion(day1.stats, "2024-06-19", 4);
  assert.equal(day2.isReturn, true);
  assert.equal(day2.stats.currentStreak, 2);
  assert.equal(day2.stats.maxStreak, 2);
  assert.equal(day2.stats.totalCompleted, 2);
});

test("a gap resets the streak to 1 but preserves maxStreak", () => {
  const day1 = recordDailyCompletion(createInitialStats(), "2024-06-18", 5);
  const day2 = recordDailyCompletion(day1.stats, "2024-06-19", 4);
  const day2Result = day2.stats;
  assert.equal(day2Result.currentStreak, 2);

  // Skip a day: 2024-06-21 is not consecutive after 2024-06-19.
  const day3 = recordDailyCompletion(day2Result, "2024-06-21", 6);
  assert.equal(day3.isReturn, true);
  assert.equal(day3.stats.currentStreak, 1);
  assert.equal(day3.stats.maxStreak, 2, "maxStreak should retain the prior peak");
  assert.equal(day3.stats.totalCompleted, 3);
});

test("moveCounts tallies completions by move count across multiple days", () => {
  const day1 = recordDailyCompletion(createInitialStats(), "2024-06-18", 5);
  const day2 = recordDailyCompletion(day1.stats, "2024-06-19", 5);
  const day3 = recordDailyCompletion(day2.stats, "2024-06-20", 4);
  assert.deepEqual(day3.stats.moveCounts, { 5: 2, 4: 1 });
});

test("a non-consecutive but later day still reports isReturn: true", () => {
  const day1 = recordDailyCompletion(createInitialStats(), "2024-06-18", 5);
  const dayLater = recordDailyCompletion(day1.stats, "2024-07-01", 5);
  assert.equal(dayLater.isReturn, true);
  assert.equal(dayLater.stats.currentStreak, 1);
});
