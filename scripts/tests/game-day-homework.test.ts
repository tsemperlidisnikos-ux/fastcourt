import assert from "node:assert/strict";
import {
  buildGameDayCategories,
  resolveGameDayCategoryIndex,
} from "../../src/lib/game-plan/game-day";
import {
  ensureHomeworkPlayerToken,
  validateHomeworkPlayerToken,
} from "../../src/lib/game-plan/player-homework-ack";
import type { GamePlan, PlayerHomeworkAssignment } from "../../src/types/library-meta";

const plan: GamePlan = {
  id: "gp1",
  title: "vs Rivals",
  opponent: "Rivals",
  gameDate: "2026-07-05",
  team: "Varsity",
  entries: [
    { id: "e1", categoryId: "ato", playId: "p1", callName: "Spain" },
    { id: "e2", categoryId: "zone", playId: "p2", callName: "Zone punch" },
  ],
  status: "ready",
  createdAt: "2026-06-30T12:00:00.000Z",
  updatedAt: "2026-06-30T12:00:00.000Z",
};

const categories = buildGameDayCategories(plan, [
  {
    id: "p1",
    title: "ATO Spain",
    courtType: "half",
    type: "play",
    tags: [],
    favorite: false,
    createdAt: "",
    updatedAt: "",
    source: "manual",
    frames: [],
  },
  {
    id: "p2",
    title: "Zone Punch",
    courtType: "half",
    type: "play",
    tags: [],
    favorite: false,
    createdAt: "",
    updatedAt: "",
    source: "manual",
    frames: [],
  },
]);

assert.equal(categories.length, 2);
assert.equal(categories[0]?.calls[0]?.name, "Spain");
assert.equal(resolveGameDayCategoryIndex(categories, "zone"), 1);

const assignment: PlayerHomeworkAssignment = {
  id: "hw1",
  gamePlanId: "gp1",
  title: "Homework",
  opponent: "Rivals",
  gameDate: "2026-07-05",
  dueDate: "2026-07-04",
  team: "Varsity",
  playIds: ["p1"],
  playerTokens: {},
  playerStatus: {},
  status: "open",
  createdAt: "2026-06-30T12:00:00.000Z",
  updatedAt: "2026-06-30T12:00:00.000Z",
};

const tokens = ensureHomeworkPlayerToken(assignment, "player1");
assert.ok(tokens.player1);
assert.equal(
  validateHomeworkPlayerToken(
    { ...assignment, playerTokens: tokens },
    "player1",
    tokens.player1!,
  ),
  true,
);

console.log("game-day-homework.test.ts: ok");
