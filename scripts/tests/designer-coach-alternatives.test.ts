import assert from "node:assert/strict";
import { rankCoachAlternativePlays } from "../../src/lib/designer/designer-coach-alternatives";
import type { GamePlan, PlaybookSection } from "../../src/types/library-meta";
import type { StoredPlay } from "../../src/types/library";

function baseFrame() {
  return {
    id: "f1",
    objects: [
      { id: "o1", kind: "offense" as const, x: 0.5, y: 0.7, label: "1", hasBall: true },
      { id: "o2", kind: "offense" as const, x: 0.8, y: 0.35, label: "2" },
      { id: "o3", kind: "offense" as const, x: 0.2, y: 0.35, label: "3" },
      { id: "o4", kind: "offense" as const, x: 0.65, y: 0.2, label: "4" },
      { id: "o5", kind: "offense" as const, x: 0.35, y: 0.2, label: "5" },
    ],
    actions: [
      { id: "a1", type: "screen" as const, x1: 0.5, y1: 0.7, x2: 0.55, y2: 0.62 },
      { id: "a2", type: "cut" as const, x1: 0.2, y1: 0.35, x2: 0.35, y2: 0.55 },
    ],
    actionSequence: ["a1", "a2"],
  };
}

function makePlay(overrides: Partial<StoredPlay> = {}): StoredPlay {
  return {
    id: "current",
    title: "PNR Side",
    type: "play",
    courtType: "half",
    series: "Horns Family",
    frames: [baseFrame()],
    updatedAt: "",
    createdAt: "",
    ...overrides,
  };
}

const current = makePlay();
const dnaTwin = makePlay({
  id: "dna-twin",
  title: "PNR Side Alt",
  series: "Other",
});
const seriesSibling = makePlay({
  id: "series-sib",
  title: "Horns Flare",
  series: "Horns Family",
  frames: [
    {
      ...baseFrame(),
      id: "f2",
      objects: [
        { id: "p1", kind: "offense", x: 0.1, y: 0.1, label: "1" },
        { id: "p2", kind: "offense", x: 0.9, y: 0.1, label: "2" },
      ],
      actions: [{ id: "x1", type: "pass", x1: 0.1, y1: 0.1, x2: 0.9, y2: 0.1 }],
      actionSequence: ["x1"],
    },
  ],
});
const planPlay = makePlay({
  id: "plan-play",
  title: "ATO Special",
  series: "ATO",
  frames: [
    {
      id: "f3",
      objects: [{ id: "z1", kind: "offense", x: 0.5, y: 0.5, label: "1" }],
      actions: [],
    },
  ],
});

const playbooks: PlaybookSection[] = [
  {
    id: "pb-1",
    name: "Horns",
    team: "Varsity",
    playRefs: ["current", "series-sib"],
    updatedAt: "",
  },
];

const gamePlan: GamePlan = {
  id: "gp-1",
  title: "vs Central",
  opponent: "Central",
  gameDate: "2026-07-10",
  team: "Varsity",
  status: "active",
  entries: [{ id: "e1", categoryId: "ato", playId: "plan-play", label: "ATO Special" }],
  createdAt: "",
  updatedAt: "",
};

const library = [dnaTwin, seriesSibling, planPlay];

const ranked = rankCoachAlternativePlays({
  play: current,
  library,
  playbooks,
  gamePlan,
});

assert.ok(ranked.length >= 2, "expected ranked alternatives");
assert.equal(ranked[0]?.play.id, "dna-twin", "DNA twin should rank first");

const seriesOnly = rankCoachAlternativePlays({
  play: current,
  library: [seriesSibling, planPlay],
  playbooks,
});
const seriesRow = seriesOnly.find((row) => row.play.id === "series-sib");
assert.ok(seriesRow, "expected series sibling");
assert.ok(
  seriesRow.reasons.some((reason) => reason.includes("series") || reason.includes("playbook")),
  "series/playbook should contribute",
);

const planOnly = rankCoachAlternativePlays({
  play: current,
  library: [planPlay],
  gamePlan,
});
assert.equal(planOnly[0]?.play.id, "plan-play");
assert.ok(
  planOnly[0]?.reasons.some((reason) => reason.includes("game plan")),
  "game plan entry should score",
);

console.log("designer-coach-alternatives.test.ts OK");
