import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPracticeSessionFromGamePlan } from "../../src/lib/game-plan/prep-practice.ts";
import {
  buildPostGameReadOutcomeNotes,
  buildPrepReadRecommendations,
  collectPlanCoverages,
  countPrepReadBlocks,
  createPrepReadPracticeItems,
  mergePostGameNotes,
} from "../../src/lib/game-plan/read-recommendations.ts";
import type { GamePlan, PracticeSession } from "../../src/types/library-meta.ts";
import type { StoredPlay } from "../../src/types/library.ts";

const now = "2026-06-30T12:00:00.000Z";

const plan: GamePlan = {
  id: "gp1",
  title: "vs Celtics",
  opponent: "Celtics",
  gameDate: "2026-07-10",
  team: "Varsity",
  entries: [{ id: "e1", categoryId: "ato", playId: "play1" }],
  timeoutCues: [
    {
      id: "cue1",
      title: "ICE on ball screen",
      detail: "Snake read vs ICE",
      coverage: "ICE",
      createdAt: now,
    },
  ],
  status: "draft",
  createdAt: now,
  updatedAt: now,
};

const plays: StoredPlay[] = [
  {
    id: "play1",
    title: "Horns Snake",
    courtType: "half",
    type: "play",
    tags: [],
    team: "Varsity",
    frames: [{ id: "f1", name: "Frame 1", objects: [], actions: [], actionSequence: [] }],
    createdAt: now,
    updatedAt: now,
  },
];

const opponentSessions: PracticeSession[] = [
  {
    id: "ps1",
    date: "2026-07-05",
    title: "Prep: vs Celtics",
    team: "Varsity",
    items: [
      { id: "a", durationMin: 10, liveCall: "Snake ICE", readOutcome: "missed" },
      { id: "b", durationMin: 10, liveCall: "Snake ICE", readOutcome: "missed" },
      { id: "c", durationMin: 10, liveCall: "Snake ICE", readOutcome: "landed" },
      { id: "d", durationMin: 10, liveCall: "Reject", readOutcome: "landed" },
    ],
    createdAt: now,
    updatedAt: now,
  },
];

describe("read-recommendations", () => {
  it("collects timeout coverage cues", () => {
    assert.deepEqual(collectPlanCoverages(plan), ["ice"]);
  });

  it("recommends weak opponent reads and prioritizes coverage matches", () => {
    const recs = buildPrepReadRecommendations(
      plan,
      opponentSessions,
      plays,
      [plan],
    );
    assert.ok(recs.length >= 1);
    assert.equal(recs[0]?.call, "Snake ICE");
    assert.equal(recs[0]?.matchesCoverage, true);
    assert.equal(recs[0]?.source, "opponent-history");
    assert.equal(recs[0]?.suggestedBlocks, 1);
  });

  it("creates practice items from recommendations", () => {
    const recs = buildPrepReadRecommendations(
      plan,
      opponentSessions,
      plays,
      [plan],
    );
    const items = createPrepReadPracticeItems(recs[0]!);
    assert.equal(items.length, recs[0]!.suggestedBlocks);
    assert.equal(items[0]?.liveCall, "Snake ICE");
    assert.match(items[0]?.notes || "", /Coverage focus: ice/i);
  });

  it("appends read drill blocks to prep practice session", () => {
    const recs = buildPrepReadRecommendations(
      plan,
      opponentSessions,
      plays,
      [plan],
    );
    const session = buildPracticeSessionFromGamePlan(plan, plays, {
      sessionId: "prac_test",
      now,
      readRecommendations: recs,
    });
    assert.equal(session.items.length, 1 + countPrepReadBlocks(recs));
    assert.match(session.notes, /Read drills:/);
  });

  it("builds post-game read outcome notes", () => {
    const notes = buildPostGameReadOutcomeNotes(plan, opponentSessions, [plan]);
    assert.match(notes || "", /\[Reads vs Celtics\]/);
    assert.match(notes || "", /Snake ICE/);
  });

  it("merges post-game notes without duplicating read block", () => {
    const auto = buildPostGameReadOutcomeNotes(plan, opponentSessions, [plan]);
    const merged = mergePostGameNotes("Great win.", auto);
    assert.match(merged || "", /Great win\./);
    assert.match(merged || "", /\[Reads vs Celtics\]/);
    const again = mergePostGameNotes(merged || "", auto);
    assert.equal(again, merged);
  });
});

console.log("read-recommendations.test.ts: ok");
