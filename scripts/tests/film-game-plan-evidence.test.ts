import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGamePlanDraft } from "../../src/lib/game-plan/game-plan-items.ts";
import { buildAiScoutGamePlanPatch } from "../../src/lib/film-room/apply-ai-scout-to-game-plan.ts";
import {
  collectGamePlanFilmEvidence,
  createAiScoutFilmRef,
  mergeFilmRefs,
  normalizeFilmRefs,
} from "../../src/lib/film-room/film-game-plan-evidence.ts";

describe("film game plan evidence", () => {
  it("collects film evidence from board tags, timeout cues, and refs", () => {
    const plan = createGamePlanDraft("Rival", "Varsity");
    plan.opponentBoard = [
      {
        id: "obt_1",
        kind: "zone",
        label: "Zone offense",
        filmSessionId: "film_a",
        filmTimestamp: 40,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ];
    plan.timeoutCues = [
      {
        id: "gtc_1",
        title: "ICE side PNR",
        detail: "Force baseline.",
        coverage: "ice",
        sourceFilmSessionId: "film_b",
        sourceFilmTimestamp: 120,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ];
    plan.filmRefs = [
      createAiScoutFilmRef("film_c", 90, "Horns entry from the slot."),
    ];

    const items = collectGamePlanFilmEvidence(plan);
    assert.equal(items.length, 3);
    assert.equal(items[0]?.sessionId, "film_a");
    assert.equal(items[0]?.timeLabel, "0:40");
    assert.equal(items[1]?.sessionId, "film_c");
    assert.equal(items[2]?.sessionId, "film_b");
  });

  it("dedupes identical session and timestamp entries", () => {
    const ref = createAiScoutFilmRef("film_1", 55, "Same clip");
    const plan = createGamePlanDraft("Rival", "Varsity");
    plan.filmRefs = [ref];
    plan.opponentBoard = [
      {
        id: "obt_1",
        kind: "halfcourt",
        label: "AI scout @ 0:55",
        filmSessionId: "film_1",
        filmTimestamp: 55,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ];

    const items = collectGamePlanFilmEvidence(plan);
    assert.equal(items.length, 1);
  });

  it("mergeFilmRefs keeps unique refs only", () => {
    const first = createAiScoutFilmRef("film_1", 10, "Clip A");
    const merged = mergeFilmRefs([first], [createAiScoutFilmRef("film_1", 10, "Clip A")]);
    assert.equal(normalizeFilmRefs(merged).length, 1);
  });

  it("buildAiScoutGamePlanPatch stores a film ref", () => {
    const plan = createGamePlanDraft("Rival", "Varsity");
    const patch = buildAiScoutGamePlanPatch({
      plan,
      plays: [],
      analysis: {
        summary: "Side PNR with weak-side tag.",
        tendencies: [
          {
            kind: "halfcourt",
            label: "Side ball screen",
            confidence: 0.8,
          },
        ],
        playPatterns: [],
        coaching: {
          alternativeOptions: [],
          counters: [],
          defensiveAdjustments: [],
          spacingFixes: [],
          timingCorrections: [],
        },
      },
      sessionId: "film_scout",
      sessionTitle: "Q1",
      timestamp: 72,
      selectedTendencyIndices: [0],
      includeDefensePlays: false,
    });

    assert.equal(patch.filmRefs?.length, 1);
    assert.equal(patch.filmRefs?.[0]?.sessionId, "film_scout");
    assert.equal(patch.filmRefs?.[0]?.timestamp, 72);
    assert.match(patch.filmRefs?.[0]?.label ?? "", /1:12/);
  });
});
