import assert from "node:assert/strict";
import {
  buildGameDayPatch,
  createGameDaySyncToken,
  ensureGameDaySyncToken,
} from "../../src/lib/game-plan/game-day-live";
import { encodeGameDayPayload } from "../../src/lib/share/share-link";
import type { GamePlan } from "../../src/types/library-meta";

const plan: GamePlan = {
  id: "gp_live_1",
  title: "vs Opponents",
  opponent: "Opponents",
  gameDate: "2026-07-10",
  team: "Varsity",
  entries: [{ id: "e1", categoryId: "ato", playId: "p1", callName: "Spain" }],
  status: "ready",
  createdAt: "2026-06-30T12:00:00.000Z",
  updatedAt: "2026-06-30T12:00:00.000Z",
};

const token = createGameDaySyncToken();
assert.ok(token.length >= 8);
assert.equal(ensureGameDaySyncToken(plan).length >= 8, true);
assert.equal(
  ensureGameDaySyncToken({ ...plan, gameDay: { syncToken: "keep-me" } }),
  "keep-me",
);

const patched = buildGameDayPatch(plan, "zone", token);
assert.equal(patched.syncToken, token);
assert.equal(patched.activeCategoryId, "zone");
assert.ok(patched.updatedAt);

const payload = encodeGameDayPayload(
  { ...plan, gameDay: patched },
  [
    {
      id: "p1",
      title: "ATO",
      courtType: "half",
      type: "play",
      tags: [],
      favorite: false,
      createdAt: "",
      updatedAt: "",
      source: "manual",
      frames: [],
    },
  ],
  { width: 1000, height: 600 },
  "zone",
);
assert.equal(payload.type, "gameday");
if (payload.type === "gameday") {
  assert.equal(payload.syncToken, token);
  assert.equal(payload.planId, plan.id);
}

console.log("game-day-live.test.ts: ok");
