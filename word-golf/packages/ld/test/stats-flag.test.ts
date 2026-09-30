/**
 * Flag-path tests for the `show-stats` feature flag.
 *
 * Covers the flag-off (control) and flag-on (treatment) paths as they relate
 * to the @word-golf/ld package — i.e. the flag default, flag key constants,
 * and the newly-instrumented METRIC_EVENTS.statsPanelViewed event key.
 *
 * Control path (flag off): no Stats button/panel is rendered — existing
 * behavior is preserved exactly; the metric event is never emitted.
 * Treatment path (flag on): a Stats button reveals a streak/completion
 * panel; METRIC_EVENTS.statsPanelViewed is tracked each time it is opened.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { FLAG_DEFAULTS, FLAG_KEYS } from "../src/flags.js";
import { METRIC_EVENTS } from "../src/events.js";

// ---------------------------------------------------------------------------
// FLAG OFF: control path
// ---------------------------------------------------------------------------

test("flag-off: FLAG_DEFAULTS[show-stats] is false — Stats panel not rendered by default", () => {
  // The control path is preserved: when LD is offline or the flag targets
  // off, the default value must be false so the panel is never rendered.
  assert.equal(FLAG_DEFAULTS["show-stats"], false);
});

test("flag-off: FLAG_KEYS.showStats resolves to the kebab-case LD key", () => {
  // Ensures useFlag(FLAG_KEYS.showStats) in App.tsx evaluates the correct
  // flag key and returns the false default in the control cohort.
  assert.equal(FLAG_KEYS.showStats, "show-stats");
});

test("flag-off: FLAG_DEFAULTS key set includes show-stats (not undefined)", () => {
  // Verifies the key is explicitly registered in FLAG_DEFAULTS so offline
  // contexts (no LD client) always serve false rather than undefined.
  assert.ok(
    Object.prototype.hasOwnProperty.call(FLAG_DEFAULTS, "show-stats"),
    "show-stats must be an explicit entry in FLAG_DEFAULTS"
  );
});

// ---------------------------------------------------------------------------
// FLAG ON: treatment path
// ---------------------------------------------------------------------------

test("flag-on: FLAG_KEYS.showStats is present in FLAG_KEYS (not undefined)", () => {
  // Treatment path relies on this key to evaluate the flag. Must be registered.
  assert.ok(
    Object.prototype.hasOwnProperty.call(FLAG_KEYS, "showStats"),
    "showStats must be an explicit entry in FLAG_KEYS"
  );
});

test("flag-on: FLAG_KEYS.showStats value uses kebab-case (no underscores)", () => {
  // LaunchDarkly flag keys use kebab-case; the provider is configured with
  // useCamelCaseFlagKeys: false so the raw key string must be kebab-case.
  assert.ok(
    !FLAG_KEYS.showStats.includes("_"),
    "show-stats must be kebab-case (no underscores)"
  );
});

test("flag-on: show-stats key is distinct from all other FLAG_KEYS values", () => {
  // Ensures no accidental collision with an existing flag key.
  const allKeys = Object.entries(FLAG_KEYS) as [string, string][];
  const duplicates = allKeys.filter(
    ([name, value]) => name !== "showStats" && value === "show-stats"
  );
  assert.deepEqual(
    duplicates,
    [],
    `"show-stats" must not collide with other FLAG_KEYS entries`
  );
});

test("flag-on: existing FLAG_DEFAULTS boolean flags are unchanged (control-path flags unaffected)", () => {
  // Regression check: adding show-stats must not disturb existing flag
  // defaults that gate other features.
  assert.equal(FLAG_DEFAULTS["hint-button"], false);
  assert.equal(FLAG_DEFAULTS["show-mission-control"], false);
  assert.equal(FLAG_DEFAULTS["enable-random-puzzle"], false);
  assert.equal(FLAG_DEFAULTS["enable-share-result-button"], false);
  assert.equal(FLAG_DEFAULTS["enable-difficulty-picker-ux"], false);
  assert.equal(FLAG_DEFAULTS["show-powered-by-footer"], false);
  assert.equal(FLAG_DEFAULTS["enable-session-replay"], false);
});

// ---------------------------------------------------------------------------
// FLAG ON: treatment path — statsPanelViewed metric event
// ---------------------------------------------------------------------------

test("flag-on: METRIC_EVENTS.statsPanelViewed has the correct event key string", () => {
  // App.tsx calls track(METRIC_EVENTS.statsPanelViewed) when the Stats panel
  // is opened — treatment path only. The guarded-release manifest wires
  // "show-stats-viewed" as the business occurrence metric; must match exactly.
  assert.equal(METRIC_EVENTS.statsPanelViewed, "show-stats-viewed");
});

test("flag-on: statsPanelViewed event key is present in METRIC_EVENTS taxonomy", () => {
  // Verifies the key was added to the shared taxonomy and is importable by
  // any consumer (e.g. App.tsx) via @word-golf/ld.
  const values = Object.values(METRIC_EVENTS);
  assert.ok(
    values.includes("show-stats-viewed"),
    "show-stats-viewed must appear in METRIC_EVENTS"
  );
});

test("flag-on: METRIC_EVENTS.statsPanelViewed is distinct from all other event keys", () => {
  // Ensures no accidental collision with existing metric keys.
  const allEvents = Object.entries(METRIC_EVENTS) as [string, string][];
  const duplicates = allEvents.filter(
    ([key, value]) => key !== "statsPanelViewed" && value === "show-stats-viewed"
  );
  assert.deepEqual(
    duplicates,
    [],
    `"show-stats-viewed" must not collide with other METRIC_EVENTS entries`
  );
});

test("flag-on: statsPanelViewed event key is namespaced under show-stats", () => {
  // Per project convention, guarded-release events are prefixed with the
  // flag key. This ensures the metric is clearly scoped to this feature.
  assert.ok(
    METRIC_EVENTS.statsPanelViewed.startsWith("show-stats"),
    `statsPanelViewed event key must start with "show-stats" (got: ${METRIC_EVENTS.statsPanelViewed})`
  );
});

test("flag-on: dailyReturned event key is unchanged and now consumable by this feature", () => {
  // show-stats is the first feature to actually call
  // track(METRIC_EVENTS.dailyReturned); guard the key hasn't drifted.
  assert.equal(METRIC_EVENTS.dailyReturned, "daily_returned");
});

test("flag-on: existing metric events are unchanged (control-path events unaffected)", () => {
  // Regression guard: adding statsPanelViewed must not disturb existing
  // events that fire on both control and treatment paths.
  assert.equal(METRIC_EVENTS.puzzleCompleted, "puzzle_completed");
  assert.equal(METRIC_EVENTS.puzzleAbandoned, "puzzle_abandoned");
  assert.equal(METRIC_EVENTS.timeToSolveMs, "time_to_solve_ms");
  assert.equal(METRIC_EVENTS.madePar, "made_par");
  assert.equal(METRIC_EVENTS.hintButtonUsed, "hint-button-used");
  assert.equal(METRIC_EVENTS.poweredByFooterViewed, "show-powered-by-footer-viewed");
});

// ---------------------------------------------------------------------------
// FLAG OFF: statsPanelViewed must never fire in control path
// ---------------------------------------------------------------------------

test("flag-off: showStats default false ensures the Stats button is never rendered (metric event never emitted)", () => {
  // In App.tsx the Stats button/panel is gated by `{showStats && ...}`. With
  // the flag default of false, the button never renders and
  // track(METRIC_EVENTS.statsPanelViewed) is never reached. This test
  // verifies the structural precondition: the flag default is false AND the
  // event key is correctly registered (so when the flag IS on, the call
  // resolves to the right string).
  assert.equal(FLAG_DEFAULTS["show-stats"], false);
  assert.equal(METRIC_EVENTS.statsPanelViewed, "show-stats-viewed");
});
