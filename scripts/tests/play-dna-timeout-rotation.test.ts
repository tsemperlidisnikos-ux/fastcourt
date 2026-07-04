import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { simulateGuardRotations } from "../../src/lib/designer/defense-rotation-sim.ts";
import {
  findSimilarPlays,
  fingerprintPlay,
  playSimilarity,
} from "../../src/lib/library/play-dna.ts";
import { buildTimeoutSlides } from "../../src/lib/game-plan/timeout-mode.ts";
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
        objects: [
          { id: "o1", kind: "offense", x: 0.5, y: 0.5, hasBall: true },
          { id: "d1", kind: "defense", x: 0.5, y: 0.65, defenseStyle: "guard" },
        ],
        actions: [{ id: "a1", type: "cut", x1: 0.5, y1: 0.5, x2: 0.6, y2: 0.4 }],
        actionSequence: ["a1"],
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("play dna", () => {
  it("finds similar plays with matching actions and spacing", () => {
    const base = makePlay("base");
    const twin = makePlay("twin", { title: "Twin" });
    const different = makePlay("different", {
      frames: [
        {
          id: "f1",
          name: "Frame 1",
          objects: [{ id: "o1", kind: "offense", x: 0.1, y: 0.9 }],
          actions: [{ id: "a1", type: "pass", x1: 0.1, y1: 0.9, x2: 0.9, y2: 0.1 }],
          actionSequence: ["a1"],
        },
      ],
    });

    const matches = findSimilarPlays(base, [twin, different]);
    assert.equal(matches[0]?.play.id, "twin");
    assert.ok((matches[0]?.score ?? 0) > 0.8);
  });

  it("scores zero for different court types", () => {
    const half = fingerprintPlay(makePlay("half"));
    const full = fingerprintPlay(makePlay("full", { courtType: "full" }));
    assert.ok(half && full);
    assert.equal(playSimilarity(half, full), 0);
  });
});

describe("defensive rotation sim", () => {
  it("rotates guard defenders toward the ball", () => {
    const objects = [
      { id: "o1", kind: "offense" as const, x: 0.5, y: 0.4, hasBall: true },
      { id: "d1", kind: "defense" as const, x: 0.5, y: 0.7, defenseStyle: "guard" as const },
    ];
    const next = simulateGuardRotations(objects);
    const guard = next.find((obj) => obj.id === "d1");
    assert.ok(guard?.rotation != null);
    assert.ok(Math.abs((guard.rotation ?? 0) - 0) < 5);
  });
});

describe("timeout mode", () => {
  it("builds slides from ATO/BLOB/SLOB categories", () => {
    const play = makePlay("p1");
    const plan: GamePlan = {
      id: "gp1",
      title: "vs Opponent",
      opponent: "Opponent",
      gameDate: "2026-07-04",
      team: "Team",
      entries: [
        {
          id: "e1",
          categoryId: "halfcourt",
          playId: "p1",
          callName: "Horns",
        },
        {
          id: "e2",
          categoryId: "ato",
          playId: "p1",
          callName: "ATO 1",
        },
      ],
      status: "ready",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const slides = buildTimeoutSlides(plan, new Map([["p1", play]]));
    assert.equal(slides.length, 1);
    assert.equal(slides[0]?.callLabel, "ATO 1");
    assert.equal(slides[0]?.categoryId, "ato");
  });
});
