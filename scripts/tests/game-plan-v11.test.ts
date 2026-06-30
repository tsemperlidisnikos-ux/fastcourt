import assert from "node:assert/strict";
import { suggestPlaysForGamePlanCategory } from "../../src/lib/game-plan/suggest-plays";
import {
  buildPracticeSessionFromGamePlan,
  computePrepPracticeDate,
} from "../../src/lib/game-plan/prep-practice";
import type { GamePlan } from "../../src/types/library-meta";
import type { StoredPlay } from "../../src/types/library";

const now = "2026-06-30T12:00:00.000Z";

const plays: StoredPlay[] = [
  {
    id: "p1",
    title: "Horns Flare",
    courtType: "half",
    type: "play",
    tags: ["zone", "horns"],
    team: "Varsity",
    frames: [{ id: "f1", name: "Frame 1", objects: [], actions: [], actionSequence: [] }],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "p2",
    title: "ATO Spain",
    courtType: "half",
    type: "play",
    tags: ["ato"],
    team: "Varsity",
    frames: [{ id: "f2", name: "Frame 1", objects: [], actions: [], actionSequence: [] }],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "p3",
    title: "Warmup layups",
    courtType: "half",
    type: "drill",
    tags: ["warmup"],
    team: "Varsity",
    frames: [{ id: "f3", name: "Frame 1", objects: [], actions: [], actionSequence: [] }],
    createdAt: now,
    updatedAt: now,
  },
];

const zoneSuggestions = suggestPlaysForGamePlanCategory(
  plays,
  "zone",
  new Set<string>(),
);
assert.equal(zoneSuggestions[0]?.play.id, "p1");
assert.ok(zoneSuggestions.every((row) => row.play.id !== "p3"));

const atoSuggestions = suggestPlaysForGamePlanCategory(plays, "ato", new Set(["p2"]));
assert.equal(atoSuggestions.length, 0);

assert.equal(
  computePrepPracticeDate("2026-07-05", new Date("2026-06-30T10:00:00.000Z")),
  "2026-07-04",
);
assert.equal(
  computePrepPracticeDate("2026-07-01", new Date("2026-06-30T10:00:00.000Z")),
  "2026-06-30",
);

const plan: GamePlan = {
  id: "gp1",
  title: "vs Rivals",
  opponent: "Rivals",
  gameDate: "2026-07-05",
  team: "Varsity",
  entries: [
    { id: "e1", categoryId: "zone", playId: "p1" },
    { id: "e2", categoryId: "ato", playId: "p2", callName: "Spain" },
  ],
  status: "draft",
  createdAt: now,
  updatedAt: now,
};

const session = buildPracticeSessionFromGamePlan(plan, plays, {
  sessionId: "prac_test",
  now,
});
assert.equal(session.title, "Prep: vs Rivals");
assert.equal(session.items.length, 2);
const byPlay = new Map(session.items.map((item) => [item.playId, item]));
assert.match(byPlay.get("p1")?.cueLabel || "", /Vs Zone/i);
assert.match(byPlay.get("p2")?.cueLabel || "", /Spain/i);

console.log("game-plan-v11.test.ts: ok");
