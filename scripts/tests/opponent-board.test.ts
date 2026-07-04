import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createOpponentTendency,
  normalizeOpponentTendencies,
  suggestDefenseForTendency,
} from "../../src/lib/game-plan/opponent-board.ts";
import { normalizeGamePlan } from "../../src/lib/game-plan/game-plan-items.ts";
import type { StoredPlay } from "../../src/types/library.ts";
import type { GamePlan } from "../../src/types/library-meta.ts";

function makePlay(
  id: string,
  overrides: Partial<StoredPlay> = {},
): StoredPlay {
  const now = new Date().toISOString();
  return {
    id,
    title: id,
    type: "play",
    tags: [],
    courtType: "half",
    frames: [
      {
        id: "f1",
        name: "Frame 1",
        objects: [],
        actions: [],
        actionSequence: [],
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("opponent board", () => {
  it("normalizes tendencies and keeps game plan field", () => {
    const plan = normalizeGamePlan({
      id: "gp1",
      title: "vs Test",
      opponent: "Test",
      gameDate: "2026-06-01",
      team: "Team",
      entries: [],
      status: "draft",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
      opponentBoard: [
        {
          id: "obt1",
          kind: "zone",
          label: "Zone offense",
          notes: "  2-3 look  ",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    } satisfies GamePlan);

    assert.equal(plan.opponentBoard.length, 1);
    assert.equal(plan.opponentBoard[0]?.notes, "2-3 look");
    assert.equal(plan.opponentBoard[0]?.kind, "zone");
  });

  it("suggests defensive plays for press tendency", () => {
    const plays = [
      makePlay("press-break", { tags: ["press", "defense"], title: "Press break" }),
      makePlay("halfcourt", { tags: ["halfcourt"], title: "Horns" }),
    ];
    const tendency = createOpponentTendency("press");
    const suggestions = suggestDefenseForTendency(
      plays,
      tendency,
      new Set(),
      5,
    );

    assert.ok(suggestions.some((row) => row.play.id === "press-break"));
    assert.ok(!suggestions.some((row) => row.play.id === "halfcourt"));
  });

  it("fills default label when tendency label is blank", () => {
    const rows = normalizeOpponentTendencies([
      {
        id: "x",
        kind: "other",
        label: "   ",
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.label, "Other tendency");
  });
});
