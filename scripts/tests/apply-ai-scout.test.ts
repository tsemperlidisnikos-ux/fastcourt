import assert from "node:assert/strict";
import test from "node:test";
import { createGamePlanDraft } from "../../src/lib/game-plan/game-plan-items.ts";
import { buildAiScoutGamePlanPatch } from "../../src/lib/film-room/apply-ai-scout-to-game-plan.ts";
import { coachingCueKey } from "../../src/lib/film-room/film-coaching-format.ts";
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

test("buildAiScoutGamePlanPatch adds tendencies and defense plays", () => {
  const plan = createGamePlanDraft("Rival", "Varsity");
  const plays = [
    stubPlay("p_zone", "2-3 Zone Shell", ["defense", "zone"]),
    stubPlay("p_press", "Full Court Trap", ["defense", "press"]),
  ];

  const patch = buildAiScoutGamePlanPatch({
    plan,
    plays,
    analysis: {
      summary: "They run zone entry from the wing.",
      tendencies: [
        {
          kind: "zone",
          label: "Zone offense",
          confidence: 0.9,
          notes: "Flat along the lane",
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
    sessionId: "film_1",
    sessionTitle: "Q1 clip",
    timestamp: 42,
    selectedTendencyIndices: [0],
    includeDefensePlays: true,
    defensePlaysPerTendency: 2,
  });

  assert.equal(patch.tendencyCount, 1);
  assert.equal(patch.opponentBoard.length, 1);
  assert.equal(patch.opponentBoard[0]?.kind, "zone");
  assert.equal(patch.opponentBoard[0]?.filmSessionId, "film_1");
  assert.equal(patch.opponentBoard[0]?.filmTimestamp, 42);
  assert.ok(patch.opponentBoard[0]?.notes?.includes("Q1 clip"));
  assert.ok(patch.defensePlayIds.includes("p_zone"));
  assert.equal(patch.defensePlayIds.length, 2);
});

test("buildAiScoutGamePlanPatch skips plays already on the plan", () => {
  const plan = createGamePlanDraft("Rival", "Varsity");
  plan.entries = [
    {
      id: "gpe_1",
      categoryId: "defense",
      playId: "p_zone",
    },
  ];
  const plays = [stubPlay("p_zone", "2-3 Zone Shell", ["defense", "zone"])];

  const patch = buildAiScoutGamePlanPatch({
    plan,
    plays,
    analysis: {
      summary: "Zone look.",
      tendencies: [{ kind: "zone", label: "Zone", confidence: 0.8 }],
      playPatterns: [],
      coaching: {
        alternativeOptions: [],
        counters: [],
        defensiveAdjustments: [],
        spacingFixes: [],
        timingCorrections: [],
      },
    },
    sessionId: "film_1",
    sessionTitle: "Clip",
    timestamp: 10,
    selectedTendencyIndices: [0],
  });

  assert.equal(patch.defensePlayIds.length, 0);
});

test("buildAiScoutGamePlanPatch merges coaching into scouting notes", () => {
  const plan = createGamePlanDraft("Rival", "Varsity");
  plan.scoutingNotes = "Existing keys.";

  const patch = buildAiScoutGamePlanPatch({
    plan,
    plays: [],
    analysis: {
      summary: "Horns entry with weak corner closeout.",
      tendencies: [{ kind: "halfcourt", label: "Horns", confidence: 0.8 }],
      playPatterns: [{ tag: "Horns", confidence: 0.85 }],
      coaching: {
        alternativeOptions: [],
        counters: [{ title: "Show hard", detail: "Big shows hard, guard goes under.", coverage: "hard_show", targetsPattern: "PNR" }],
        defensiveAdjustments: [],
        spacingFixes: [{ title: "Close corner", detail: "No open corner three." }],
        timingCorrections: [],
      },
    },
    sessionId: "film_1",
    sessionTitle: "Q1 clip",
    timestamp: 55,
    selectedTendencyIndices: [0],
    includeDefensePlays: false,
    includeOffensePlays: false,
    includeCoachingNotes: true,
  });

  assert.ok(patch.scoutingNotes?.includes("Existing keys."));
  assert.ok(patch.scoutingNotes?.includes("Counters"));
  assert.ok(patch.scoutingNotes?.includes("Show hard"));
  assert.equal(patch.coachingSuggestionCount, 2);
  assert.ok(patch.timeoutCues?.length);
  assert.equal(patch.timeoutCues?.[0]?.coverage, "hard_show");
});

test("buildAiScoutGamePlanPatch adds counter-matched defense plays", () => {
  const plan = createGamePlanDraft("Rival", "Varsity");
  const plays = [stubPlay("p_ice", "Side PNR ICE", ["defense", "ice", "pnr"])];

  const patch = buildAiScoutGamePlanPatch({
    plan,
    plays,
    analysis: {
      summary: "Side PNR.",
      tendencies: [],
      playPatterns: [{ tag: "PNR", confidence: 0.9 }],
      coaching: {
        alternativeOptions: [],
        counters: [
          {
            title: "ICE",
            detail: "Force baseline.",
            coverage: "ice",
            targetsPattern: "PNR",
          },
        ],
        defensiveAdjustments: [],
        spacingFixes: [],
        timingCorrections: [],
      },
    },
    sessionId: "film_1",
    sessionTitle: "Clip",
    timestamp: 10,
    selectedTendencyIndices: [],
    includeDefensePlays: true,
    selectedCoachingKeys: new Set([coachingCueKey("counters", 0)]),
  });

  assert.ok(patch.defensePlayIds.includes("p_ice"));
});

test("buildAiScoutGamePlanPatch respects selected coaching keys", () => {
  const plan = createGamePlanDraft("Rival", "Varsity");
  const coaching = {
    alternativeOptions: [],
    counters: [
      { title: "ICE", detail: "Force baseline.", coverage: "ice", targetsPattern: "PNR" },
      { title: "Blitz", detail: "Trap side.", coverage: "blitz", targetsPattern: "PNR" },
    ],
    defensiveAdjustments: [],
    spacingFixes: [],
    timingCorrections: [],
  };

  const patch = buildAiScoutGamePlanPatch({
    plan,
    plays: [],
    analysis: {
      summary: "PNR look.",
      tendencies: [{ kind: "halfcourt", label: "PNR", confidence: 0.8 }],
      playPatterns: [],
      coaching,
    },
    sessionId: "film_1",
    sessionTitle: "Q1 clip",
    timestamp: 55,
    selectedTendencyIndices: [0],
    includeDefensePlays: false,
    includeOffensePlays: false,
    includeCoachingNotes: true,
    selectedCoachingKeys: new Set([coachingCueKey("counters", 0)]),
  });

  assert.ok(patch.scoutingNotes?.includes("ICE"));
  assert.equal(patch.scoutingNotes?.includes("Blitz"), false);
  assert.equal(patch.coachingSuggestionCount, 1);
});

test("buildAiScoutGamePlanPatch merges coach tags into scouting notes", () => {
  const plan = createGamePlanDraft("Rival", "Varsity");

  const patch = buildAiScoutGamePlanPatch({
    plan,
    plays: [],
    analysis: {
      summary: "Side PNR.",
      tendencies: [{ kind: "halfcourt", label: "PNR", confidence: 0.8 }],
      playPatterns: [],
      coaching: {
        alternativeOptions: [],
        counters: [],
        defensiveAdjustments: [],
        spacingFixes: [],
        timingCorrections: [],
      },
    },
    sessionId: "film_1",
    sessionTitle: "Q1 clip",
    timestamp: 45,
    selectedTendencyIndices: [0],
    includeDefensePlays: false,
    includeOffensePlays: false,
    includeCoachingNotes: false,
    coachTags: [
      { id: "evt_1", kind: "pnr", time: 44.2, note: "Side ball screen", createdAt: 1 },
      { id: "evt_2", kind: "handoff", time: 45.8, createdAt: 1 },
    ],
  });

  assert.ok(patch.scoutingNotes?.includes("Coach tags"));
  assert.ok(patch.scoutingNotes?.includes("0:44 PnR — Side ball screen"));
  assert.ok(patch.scoutingNotes?.includes("0:45 Handoff"));
});
