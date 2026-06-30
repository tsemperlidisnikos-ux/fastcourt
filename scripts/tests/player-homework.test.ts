import assert from "node:assert/strict";
import { buildHomeworkFromGamePlan } from "../../src/lib/game-plan/player-homework";
import type { GamePlan } from "../../src/types/library-meta";

const plan: GamePlan = {
  id: "gp1",
  title: "vs Rivals",
  opponent: "Rivals",
  gameDate: "2026-07-05",
  team: "Varsity",
  entries: [
    { id: "e1", categoryId: "ato", playId: "p1" },
    { id: "e2", categoryId: "zone", playId: "p2" },
  ],
  status: "ready",
  createdAt: "2026-06-30T12:00:00.000Z",
  updatedAt: "2026-06-30T12:00:00.000Z",
};

const homework = buildHomeworkFromGamePlan(plan);
assert.equal(homework.gamePlanId, "gp1");
assert.equal(homework.playIds.length, 2);
assert.equal(homework.status, "open");
assert.match(homework.title, /Homework/i);

console.log("player-homework.test.ts: ok");
