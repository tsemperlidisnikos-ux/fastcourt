import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGamePlanReadRollup } from "../../src/lib/game-plan/game-plan-read-rollup.ts";
import {
  buildPracticeReadScorecard,
  buildPracticeReadTrend,
  isReadTrackableItem,
} from "../../src/lib/practice/read-success-scorecard.ts";
import { buildFilmSessionEvaluation } from "../../src/lib/film-room/film-read-evaluation.ts";
import type { PracticeSession } from "../../src/types/library-meta.ts";

describe("read-success-scorecard", () => {
  it("detects trackable disruption read items", () => {
    assert.equal(isReadTrackableItem({ id: "1", durationMin: 10, liveCall: "Reject" }), true);
    assert.equal(isReadTrackableItem({ id: "2", durationMin: 10 }), false);
  });

  it("builds session scorecard with success rate", () => {
    const session: PracticeSession = {
      id: "s1",
      date: "2026-07-05",
      title: "Film reads",
      team: "Varsity",
      items: [
        { id: "a", durationMin: 10, liveCall: "Reject", readOutcome: "landed" },
        { id: "b", durationMin: 10, liveCall: "Snake", readOutcome: "missed" },
        { id: "c", durationMin: 10, liveCall: "Snake" },
        { id: "d", durationMin: 10 },
      ],
      createdAt: "",
      updatedAt: "",
    };
    const card = buildPracticeReadScorecard(session);
    assert.equal(card.trackableCount, 3);
    assert.equal(card.landedCount, 1);
    assert.equal(card.missedCount, 1);
    assert.equal(card.successRatePct, 50);
  });

  it("builds trend from recent sessions", () => {
    const sessions: PracticeSession[] = [
      {
        id: "s1",
        date: "2026-07-01",
        title: "Old",
        team: "Varsity",
        items: [{ id: "a", durationMin: 10, liveCall: "Reject", readOutcome: "landed" }],
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "s2",
        date: "2026-07-05",
        title: "New",
        team: "Varsity",
        items: [{ id: "b", durationMin: 10, liveCall: "Snake", readOutcome: "missed" }],
        createdAt: "",
        updatedAt: "",
      },
    ];
    const trend = buildPracticeReadTrend(sessions, 5);
    assert.equal(trend.length, 2);
    assert.equal(trend[0]?.sessionId, "s2");
  });
});

describe("game-plan-read-rollup", () => {
  it("rolls up practice outcomes for plan plays", () => {
    const rollup = buildGamePlanReadRollup(
      {
        id: "gp1",
        title: "vs Opponent",
        opponent: "Opponent",
        gameDate: "2026-07-10",
        team: "Varsity",
        entries: [{ id: "e1", categoryId: "ato", playId: "play1" }],
        status: "draft",
        createdAt: "",
        updatedAt: "",
      },
      [
        {
          id: "ps1",
          date: "2026-07-05",
          title: "Prep",
          team: "Varsity",
          items: [
            {
              id: "pi1",
              playId: "play1",
              durationMin: 10,
              liveCall: "Reject",
              readOutcome: "landed",
            },
          ],
          createdAt: "",
          updatedAt: "",
        },
      ],
      [{ id: "play1", title: "Horns ATO", type: "play", courtType: "fiba", frames: [], tags: [], updatedAt: "" }],
    );
    assert.equal(rollup.totalLanded, 1);
    assert.equal(rollup.overallRatePct, 100);
    assert.equal(rollup.playStats[0]?.playTitle, "Horns ATO");
  });
});

describe("film-read-evaluation", () => {
  it("extends batch summary with disruption rate", () => {
    const evaluation = buildFilmSessionEvaluation([
      {
        id: "a1",
        playheadTime: 30,
        frameCount: 10,
        coachTags: [],
        createdAt: 1,
        result: {
          summary: "ICE",
          tendencies: [],
          playPatterns: [],
          coaching: {
            alternativeOptions: [],
            counters: [],
            defensiveAdjustments: [],
            spacingFixes: [],
            timingCorrections: [],
          },
          disruption: { detected: true, coverage: "ice", suggestedRead: "reject" },
        },
      },
      {
        id: "a2",
        playheadTime: 60,
        frameCount: 10,
        coachTags: [],
        createdAt: 2,
        result: {
          summary: "Clean",
          tendencies: [],
          playPatterns: [],
          coaching: {
            alternativeOptions: [],
            counters: [],
            defensiveAdjustments: [],
            spacingFixes: [],
            timingCorrections: [],
          },
        },
      },
    ]);
    assert.equal(evaluation.disruptionRatePct, 50);
  });
});
