import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mirrorFrameHorizontal, mirrorPlayHorizontal } from "@/lib/designer/mirror-frame";
import { createBlankPlay } from "@/lib/designer/play-factory";
import { makeAction, makeFrame, offense } from "./helpers";

describe("mirror frame / play", () => {
  it("mirrorFrameHorizontal flips player x coordinates", () => {
    const frame = makeFrame([offense("o1", "1", 0.3, 0.5)]);
    const mirrored = mirrorFrameHorizontal(frame, "half");
    assert.ok(Math.abs(mirrored.objects[0].x - 0.7) < 0.001);
  });

  it("mirrorFrameHorizontal flips action endpoints", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.5, 0.6)],
      [makeAction("pass", 0.4, 0.6, 0.6, 0.4, "p1")],
    );
    const mirrored = mirrorFrameHorizontal(frame, "half");
    const action = mirrored.actions[0];
    assert.ok(Math.abs(action.x1 - 0.6) < 0.001);
    assert.ok(Math.abs(action.x2 - 0.4) < 0.001);
  });

  it("double mirror restores original x positions", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.33, 0.55, true)],
      [makeAction("cut", 0.33, 0.55, 0.7, 0.4, "c1")],
    );
    const once = mirrorFrameHorizontal(frame, "half");
    const twice = mirrorFrameHorizontal(once, "half");
    assert.ok(Math.abs(twice.objects[0].x - 0.33) < 0.001);
    assert.equal(twice.objects[0].hasBall, true);
  });

  it("mirrorPlayHorizontal mirrors every frame", () => {
    const play = createBlankPlay("Mirror test");
    play.frames[0] = makeFrame([offense("o1", "1", 0.2, 0.5)]);
    const mirrored = mirrorPlayHorizontal(play);
    assert.ok(Math.abs(mirrored.frames[0].objects[0].x - 0.8) < 0.001);
  });
});
