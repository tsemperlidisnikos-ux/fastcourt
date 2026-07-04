import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGamePlanDraft } from "../../src/lib/game-plan/game-plan-items.ts";
import {
  buildTimeoutReadSlides,
  buildTimeoutViewSlides,
} from "../../src/lib/game-plan/timeout-mode.ts";
import { createDisruptionFilmRef } from "../../src/lib/film-room/film-game-plan-evidence.ts";
import type { StoredPlay } from "../../src/types/library.ts";

describe("timeout read slides", () => {
  const play: StoredPlay = {
    id: "play_reject",
    title: "Horns Reject",
    type: "play",
    tags: ["reject"],
    frames: [{ id: "f0", objects: [] }, { id: "f1", objects: [], readBranch: { coverage: "ice", parentFrameId: "f0" } }],
    courtType: "half",
    createdAt: "",
    updatedAt: "",
  };

  it("builds read slides from film refs with playId", () => {
    const plan = createGamePlanDraft("Rival", "Varsity");
    plan.filmRefs = [
      createDisruptionFilmRef({
        sessionId: "film_1",
        timestamp: 40,
        label: "Horns Reject",
        playId: "play_reject",
        frameIndex: 1,
        readLabel: "Reject / snake",
      }),
    ];

    const slides = buildTimeoutReadSlides(plan, new Map([[play.id, play]]));
    assert.equal(slides.length, 1);
    assert.equal(slides[0]?.callLabel, "Reject / snake");
    assert.equal(slides[0]?.frameIndex, 1);
    assert.equal(slides[0]?.filmSessionId, "film_1");
  });

  it("includes read slides in timeout view before ATO plays", () => {
    const plan = createGamePlanDraft("Rival", "Varsity");
    plan.filmRefs = [
      createDisruptionFilmRef({
        sessionId: "film_1",
        timestamp: 40,
        label: "Read",
        playId: "play_reject",
        frameIndex: 1,
        readLabel: "Reject",
      }),
    ];
    plan.entries = [
      { id: "e1", categoryId: "ato", playId: "play_reject", callName: "ATO 1" },
    ];

    const view = buildTimeoutViewSlides(plan, new Map([[play.id, play]]));
    assert.equal(view[0]?.kind, "read");
    assert.equal(view[1]?.kind, "play");
  });
});
