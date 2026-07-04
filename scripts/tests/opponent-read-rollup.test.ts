import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOpponentReadRollup,
  filterOpponentPracticeSessions,
  sessionMatchesOpponent,
} from "../../src/lib/game-plan/opponent-read-rollup.ts";
import {
  buildReadSuccessLookup,
  lookupReadSuccessPct,
} from "../../src/lib/practice/read-success-by-call.ts";
import { buildReadPlayerAttribution } from "../../src/lib/practice/read-player-attribution.ts";
import { COACH_SEASON_TREND_SESSIONS } from "../../src/lib/coach/coach-dashboard.ts";
import { buildPracticeReadTrend } from "../../src/lib/practice/read-success-scorecard.ts";
import type { GamePlan, PracticeSession } from "../../src/types/library-meta.ts";

const basePlan: GamePlan = {
  id: "gp1",
  title: "vs Celtics",
  opponent: "Celtics",
  gameDate: "2026-07-10",
  team: "Varsity",
  entries: [{ id: "e1", categoryId: "ato", playId: "play1" }],
  status: "draft",
  createdAt: "",
  updatedAt: "",
};

describe("opponent-read-rollup", () => {
  it("matches sessions by opponent in title", () => {
    const session: PracticeSession = {
      id: "ps1",
      date: "2026-07-05",
      title: "Prep: vs Celtics",
      team: "Varsity",
      items: [],
      createdAt: "",
      updatedAt: "",
    };
    assert.equal(sessionMatchesOpponent(session, basePlan), true);
  });

  it("filters and rolls up opponent-scoped read outcomes", () => {
    const sessions: PracticeSession[] = [
      {
        id: "ps1",
        date: "2026-07-05",
        title: "Prep: vs Celtics",
        team: "Varsity",
        items: [
          { id: "a", durationMin: 10, liveCall: "Snake", readOutcome: "landed" },
          { id: "b", durationMin: 10, liveCall: "Snake", readOutcome: "landed" },
          { id: "c", durationMin: 10, liveCall: "Reject", readOutcome: "missed" },
        ],
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "ps2",
        date: "2026-07-05",
        title: "Generic reads",
        team: "Varsity",
        items: [
          { id: "d", durationMin: 10, liveCall: "Snake", readOutcome: "missed" },
        ],
        createdAt: "",
        updatedAt: "",
      },
    ];
    const filtered = filterOpponentPracticeSessions(basePlan, sessions);
    assert.equal(filtered.length, 1);
    const rollup = buildOpponentReadRollup(basePlan, sessions);
    assert.equal(rollup.totalLanded, 2);
    assert.equal(rollup.totalMissed, 1);
    assert.equal(rollup.overallRatePct, 67);
    assert.equal(rollup.byCall[0]?.call, "Snake");
  });
});

describe("read-success-by-call", () => {
  it("looks up success rate by call label", () => {
    const lookup = buildReadSuccessLookup([
      {
        id: "ps1",
        date: "2026-07-05",
        title: "Reads",
        team: "Varsity",
        items: [
          { id: "a", durationMin: 10, liveCall: "Snake", readOutcome: "landed" },
          { id: "b", durationMin: 10, liveCall: "Snake", readOutcome: "missed" },
        ],
        createdAt: "",
        updatedAt: "",
      },
    ]);
    assert.equal(lookupReadSuccessPct(lookup, "Snake"), 50);
  });
});

describe("read-player-attribution", () => {
  it("aggregates outcomes by roster player", () => {
    const result = buildReadPlayerAttribution(
      [
        {
          id: "ps1",
          date: "2026-07-05",
          title: "Reads",
          team: "Varsity",
          items: [
            {
              id: "a",
              durationMin: 10,
              liveCall: "Snake",
              readOutcome: "landed",
              readPlayerId: "p1",
            },
            {
              id: "b",
              durationMin: 10,
              liveCall: "Reject",
              readOutcome: "missed",
              readPlayerId: "p1",
            },
          ],
          createdAt: "",
          updatedAt: "",
        },
      ],
      [{ id: "p1", name: "Alex", team: "Varsity" }],
    );
    assert.equal(result.players.length, 1);
    assert.equal(result.players[0]?.successRatePct, 50);
    assert.equal(result.players[0]?.playerName, "Alex");
  });
});

describe("season trend", () => {
  it("supports 10-session coach season window", () => {
    assert.equal(COACH_SEASON_TREND_SESSIONS, 10);
    const sessions: PracticeSession[] = Array.from({ length: 12 }, (_, index) => ({
      id: `s${index}`,
      date: `2026-06-${String(index + 1).padStart(2, "0")}`,
      title: `Session ${index}`,
      team: "Varsity",
      items: [
        {
          id: `i${index}`,
          durationMin: 10,
          liveCall: "Snake",
          readOutcome: index % 2 === 0 ? "landed" : "missed",
        },
      ],
      createdAt: "",
      updatedAt: "",
    }));
    const trend = buildPracticeReadTrend(sessions, COACH_SEASON_TREND_SESSIONS);
    assert.equal(trend.length, 10);
  });
});
