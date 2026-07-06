import assert from "node:assert/strict";
import { analyzePlayLocally } from "../../src/lib/designer/analyze-play-locally";
import {
  buildDesignerCoachGamePlanSnapshot,
  mergeGamePlanCounters,
  resolveDesignerCoachGamePlanId,
} from "../../src/lib/designer/designer-coach-game-plan";
import type { GamePlan } from "../../src/types/library-meta";
import type { StoredPlay } from "../../src/types/library";

function makePlay(): StoredPlay {
  return {
    id: "play-test",
    title: "PNR Side",
    type: "play",
    courtType: "half",
    team: "Varsity",
    frames: [
      {
        id: "f1",
        name: "Frame 1",
        objects: [
          { id: "o1", kind: "offense", x: 0.5, y: 0.7, label: "1", hasBall: true },
          { id: "o2", kind: "offense", x: 0.52, y: 0.71, label: "2" },
          { id: "o3", kind: "offense", x: 0.48, y: 0.72, label: "3" },
          { id: "o4", kind: "offense", x: 0.8, y: 0.35, label: "4" },
          { id: "o5", kind: "offense", x: 0.2, y: 0.35, label: "5" },
        ],
        actions: [
          {
            id: "a1",
            type: "screen",
            x1: 0.5,
            y1: 0.7,
            x2: 0.55,
            y2: 0.62,
          },
        ],
        actionSequence: ["a1"],
        animDurationSec: 1,
      },
    ],
    tags: ["pnr"],
    series: "PNR",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function makePlan(): GamePlan {
  const now = new Date().toISOString();
  return {
    id: "gp_test",
    title: "vs Central",
    opponent: "Central",
    gameDate: "2026-07-10",
    team: "Varsity",
    scoutingNotes: "They ICE side ball screens and drop vs weak guard.",
    entries: [
      {
        id: "e1",
        categoryId: "defense",
        playId: "def-ice",
        callName: "ICE Side",
      },
    ],
    timeoutCues: [
      {
        id: "tc1",
        title: "ICE vs PNR",
        detail: "Force baseline, no middle.",
        coverage: "ice",
        targetsPattern: "PNR",
        priority: "high",
        createdAt: now,
      },
    ],
    opponentBoard: [
      {
        id: "ob1",
        kind: "halfcourt",
        label: "PNR heavy",
        createdAt: now,
      },
    ],
    status: "ready",
    createdAt: now,
    updatedAt: now,
  };
}

const plan = makePlan();
const snapshot = buildDesignerCoachGamePlanSnapshot(plan);
assert.equal(snapshot.opponent, "Central");
assert.ok(snapshot.preferredCoverages.includes("ice"));

const merged = mergeGamePlanCounters(
  [
    {
      title: "Vs PNR",
      detail: "Generic PNR counter",
      coverage: "drop",
      targetsPattern: "PNR",
      priority: "medium",
    },
  ],
  ["PNR"],
  plan,
);
assert.ok(
  merged.some((row) => row.title.includes("ICE")),
  "timeout cue counter should be merged",
);
assert.ok(
  merged.some((row) => row.coverage === "ice" && row.priority === "high"),
  "scout-aligned counter should be high priority",
);

const resolved = resolveDesignerCoachGamePlanId([plan], "Varsity", null);
assert.equal(resolved, "gp_test");

const library: StoredPlay[] = [
  {
    ...makePlay(),
    id: "def-ice",
    title: "ICE Side",
    type: "play",
    tags: ["ice", "defense"],
  },
];

const withPlan = analyzePlayLocally(makePlay(), 0, library, plan);
const withoutPlan = analyzePlayLocally(makePlay(), 0, library, null);
assert.ok(
  withPlan.coaching.counters.length >= withoutPlan.coaching.counters.length,
  "game plan should add or boost counters",
);
assert.ok(
  withPlan.coaching.counters.some(
    (row) => row.title.includes("ICE") || row.detail.toLowerCase().includes("scout"),
  ),
  "game plan should add scout-informed counters",
);
assert.ok(
  withPlan.linkedPlays.some((row) => row.playId === "def-ice"),
  "game plan defense play should appear in linked plays",
);

console.log("designer-coach-game-plan.test.ts OK");
