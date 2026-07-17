import assert from "node:assert/strict";
import test from "node:test";
import { buildCounterSuccessModel } from "../../src/lib/coach/counter-success.ts";
import {
  createCounterPracticeItems,
  formatCounterPracticeCall,
  isCounterPracticeItem,
} from "../../src/lib/practice/counter-practice.ts";
import {
  buildReadSuccessLookup,
  lookupCounterSuccessPct,
} from "../../src/lib/practice/read-success-by-call.ts";
import type { FilmClipCounterSuggestion } from "../../src/lib/film-room/film-clip-analyze-types.ts";
import type { GamePlan, PracticeSession } from "../../src/types/library-meta.ts";

const counter: FilmClipCounterSuggestion = {
  title: "ICE side PNR",
  detail: "Force baseline",
  coverage: "ice",
  targetsPattern: "PNR",
  priority: "high",
  trigger: "Wing ball screen",
};

test("createCounterPracticeItems are trackable counter drills", () => {
  const items = createCounterPracticeItems(counter, { playId: "def_1", blocks: 2 });
  assert.equal(items.length, 2);
  assert.ok(items.every(isCounterPracticeItem));
  assert.equal(items[0]?.liveCall, formatCounterPracticeCall(counter));
  assert.equal(items[0]?.playId, "def_1");
});

test("buildCounterSuccessModel aggregates practice + pending cues", () => {
  const items = createCounterPracticeItems(counter, { playId: "def_1", blocks: 2 });
  items[0]!.readOutcome = "landed";
  items[1]!.readOutcome = "missed";

  const session: PracticeSession = {
    id: "ps1",
    date: "2026-07-01",
    title: "Counters vs PAO",
    team: "Olympiacos",
    items,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };

  const plan: GamePlan = {
    id: "gp1",
    title: "vs PAO",
    opponent: "PAO",
    gameDate: "2026-07-12",
    team: "Olympiacos",
    entries: [],
    timeoutCues: [
      {
        id: "c1",
        title: "ICE side PNR",
        detail: "Force baseline",
        coverage: "ice",
        targetsPattern: "PNR",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
      {
        id: "c2",
        title: "Switch Horns",
        detail: "Switch cross",
        coverage: "switch",
        targetsPattern: "Horns",
        createdAt: "2026-07-01T00:00:00.000Z",
      },
    ],
    status: "ready",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };

  const model = buildCounterSuccessModel([session], [plan], 8);
  assert.equal(model.overallRatePct, 50);
  assert.equal(model.totalLanded, 1);
  assert.equal(model.totalMissed, 1);
  assert.ok(model.pendingCueCount >= 1);
  assert.ok(model.rows.some((row) => row.call.includes("ICE side PNR")));
});

test("lookupCounterSuccessPct matches cue title inside drill call", () => {
  const items = createCounterPracticeItems(counter, { playId: "def_1", blocks: 1 });
  items[0]!.readOutcome = "landed";
  const session: PracticeSession = {
    id: "ps1",
    date: "2026-07-01",
    title: "Counters",
    team: "A",
    items,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
  const lookup = buildReadSuccessLookup([session]);
  assert.equal(lookupCounterSuccessPct(lookup, "ICE side PNR", "def_1"), 100);
});
