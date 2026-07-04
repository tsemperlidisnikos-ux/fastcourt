import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeOpponentBoards,
  mergeScoutingNotes,
} from "../../src/lib/game-plan/opponent-board.ts";
import {
  createRematchGamePlan,
  importScoutFromPreviousPlan,
  scoutNotesFromPreviousPlan,
} from "../../src/lib/game-plan/opponent-history.ts";
import type { GamePlan } from "../../src/types/library-meta.ts";

function basePlan(overrides: Partial<GamePlan> = {}): GamePlan {
  return {
    id: "gp1",
    title: "vs Test",
    opponent: "Test",
    gameDate: "2026-05-01",
    team: "Team",
    entries: [],
    status: "archived",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("rematch scout import", () => {
  it("clones opponent board with new ids on rematch", () => {
    const source = basePlan({
      opponentBoard: [
        {
          id: "obt_old",
          kind: "zone",
          label: "Zone offense",
          createdAt: "2026-05-01T00:00:00.000Z",
        },
      ],
      postGameNotes: "Trapped the ball well.",
    });
    const rematch = createRematchGamePlan(source, "2026-06-01");
    assert.equal(rematch.opponentBoard.length, 1);
    assert.notEqual(rematch.opponentBoard[0]?.id, "obt_old");
    assert.match(rematch.scoutingNotes || "", /Trapped the ball well/);
    assert.equal(rematch.postGameNotes, undefined);
  });

  it("merges board without duplicate signatures", () => {
    const existing = [
      {
        id: "a",
        kind: "zone" as const,
        label: "Zone offense",
        createdAt: "2026-05-01T00:00:00.000Z",
      },
    ];
    const incoming = [
      {
        id: "b",
        kind: "zone" as const,
        label: "Zone offense",
        createdAt: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "c",
        kind: "press" as const,
        label: "Full-court press",
        createdAt: "2026-05-01T00:00:00.000Z",
      },
    ];
    const merged = mergeOpponentBoards(existing, incoming);
    assert.equal(merged.length, 2);
    assert.ok(merged.every((row) => row.id !== "b" && row.id !== "c"));
  });

  it("imports scout notes and board into current plan", () => {
    const target = basePlan({ id: "gp2", status: "draft", gameDate: "2026-06-15" });
    const source = basePlan({
      scoutingNotes: "They run BLOB flare",
      postGameNotes: "Switch all screens.",
      opponentBoard: [
        {
          id: "obt1",
          kind: "blob",
          label: "Baseline OB (BLOB)",
          createdAt: "2026-05-01T00:00:00.000Z",
        },
      ],
    });
    const patch = importScoutFromPreviousPlan(target, source, "May 1");
    assert.equal(patch.opponentBoard?.length, 1);
    assert.match(patch.scoutingNotes || "", /BLOB flare/);
    assert.match(patch.scoutingNotes || "", /Switch all screens/);
  });

  it("mergeScoutingNotes avoids exact duplicate blocks", () => {
    const merged = mergeScoutingNotes("Keys A", "Keys A");
    assert.equal(merged, "Keys A");
  });

  it("builds scout notes from keys and post-game", () => {
    const notes = scoutNotesFromPreviousPlan(
      basePlan({
        scoutingNotes: "Zone look",
        postGameNotes: "Rebound better",
      }),
      "May 1",
    );
    assert.match(notes || "", /Zone look/);
    assert.match(notes || "", /Post-game \(May 1\)/);
  });
});
