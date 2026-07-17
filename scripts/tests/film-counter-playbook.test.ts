import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLocalCountersForPatterns,
  inferCounterCoverageFromText,
  normalizeCounterCoverage,
  normalizeCounterSuggestion,
  suggestDefensePlaysForCounter,
} from "../../src/lib/film-room/film-counter-playbook.ts";
import type { StoredPlay } from "../../src/types/library.ts";

function stubPlay(id: string, title: string, tags: string[] = []): StoredPlay {
  return {
    id,
    title,
    courtType: "half",
    frames: [{ id: "f1", name: "Frame 1", objects: [], actions: [], actionSequence: [] }],
    type: "play",
    tags,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("normalizeCounterCoverage maps aliases", () => {
  assert.equal(normalizeCounterCoverage("hard show"), "hard_show");
  assert.equal(normalizeCounterCoverage("ICE"), "ice");
});

test("buildLocalCountersForPatterns returns rich PNR counters", () => {
  const counters = buildLocalCountersForPatterns(["PNR", "Horns"]);
  assert.ok(counters.length >= 2);
  assert.ok(counters.every((c) => c.trigger && c.ballHandlerRule && c.screenerRule));
  assert.ok(counters.some((c) => c.coverage === "ice" && c.targetsPattern === "PNR"));
  assert.ok(counters.some((c) => c.targetsPattern === "Horns"));
});

test("normalizeCounterSuggestion parses rich counter", () => {
  const counter = normalizeCounterSuggestion(
    {
      title: "ICE side PNR",
      detail: "Force baseline, no middle.",
      coverage: "ice",
      targetsPattern: "PNR",
      trigger: "On side ball screen",
      ballHandlerRule: "Force baseline",
      screenerRule: "Drop to level of ball",
      weakPoint: "Roller layup or kick to corner",
      priority: "high",
    },
    "PNR",
  );
  assert.ok(counter);
  assert.equal(counter!.coverage, "ice");
  assert.equal(counter!.targetsPattern, "PNR");
  assert.equal(counter!.ballHandlerRule, "Force baseline");
});

test("inferCounterCoverageFromText when coverage missing", () => {
  assert.equal(
    inferCounterCoverageFromText("Switch everything", "Switch cross on Horns"),
    "switch",
  );
});

test("suggestDefensePlaysForCounter matches tagged plays", () => {
  const plays = [
    stubPlay("p_ice", "Side PNR ICE", ["defense", "ice", "pnr"]),
    stubPlay("p_off", "Horns Flare", ["offense", "horns"]),
  ];
  const counter = normalizeCounterSuggestion(
    {
      title: "ICE",
      detail: "Baseline",
      coverage: "ice",
      targetsPattern: "PNR",
    },
    "PNR",
  )!;
  const matches = suggestDefensePlaysForCounter(plays, counter, new Set(), 3);
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.play.id, "p_ice");
});

test("suggestDefensePlaysForCounter prefers Counter Library meta", () => {
  const heuristic = stubPlay("p_tag", "Random ICE tag", ["defense", "ice"]);
  const library: StoredPlay = {
    ...stubPlay("p_lib", "Our ICE vs side PNR", []),
    defenseCounter: {
      enabled: true,
      coverages: ["ice"],
      vsPatterns: ["PNR"],
      notes: "Late clock",
    },
  };
  const counter = normalizeCounterSuggestion(
    {
      title: "ICE side PNR",
      detail: "Force baseline",
      coverage: "ice",
      targetsPattern: "PNR",
    },
    "PNR",
  )!;
  const matches = suggestDefensePlaysForCounter(
    [heuristic, library],
    counter,
    new Set(),
    2,
  );
  assert.equal(matches[0]?.play.id, "p_lib");
  assert.ok(matches[0]!.score > (matches[1]?.score ?? 0));
  assert.ok(matches[0]!.reasons.some((r) => /Counter Library/i.test(r)));
});
