import assert from "node:assert/strict";
import {
  createRematchGamePlan,
  findOpponentHistory,
  normalizeOpponentKey,
} from "../../src/lib/game-plan/opponent-history";
import type { GamePlan } from "../../src/types/library-meta";

const now = "2026-06-30T12:00:00.000Z";

const plans: GamePlan[] = [
  {
    id: "gp1",
    title: "vs Olympiacos",
    opponent: "Olympiacos",
    gameDate: "2026-05-10",
    team: "U18",
    entries: [],
    status: "archived",
    postGameNotes: "Zone worked in 2nd half",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "gp2",
    title: "vs olympiacos ",
    opponent: "olympiacos",
    gameDate: "2026-03-01",
    team: "U18",
    entries: [],
    status: "archived",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "gp3",
    title: "vs Panathinaikos",
    opponent: "Panathinaikos",
    gameDate: "2026-04-01",
    team: "U18",
    entries: [],
    status: "ready",
    createdAt: now,
    updatedAt: now,
  },
];

assert.equal(normalizeOpponentKey("  Olympiacos "), "olympiacos");

const history = findOpponentHistory(plans, "Olympiacos", { excludeId: "gp9", limit: 3 });
assert.equal(history.length, 2);
assert.equal(history[0]?.id, "gp1");

const rematch = createRematchGamePlan(plans[0]!, "2026-07-12");
assert.equal(rematch.opponent, "Olympiacos");
assert.equal(rematch.status, "draft");
assert.equal(rematch.gameDate, "2026-07-12");
assert.notEqual(rematch.id, "gp1");
assert.equal(rematch.postGameNotes, undefined);

console.log("game-plan-v12.test.ts: ok");
