import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FRAME_ANIM_DURATION_SEC,
  frameActionStepDurationMs,
  resolveFrameAnimDurationSec,
} from "../../src/lib/designer/animation-timing.ts";
import type { DesignerFrame } from "../../src/types/designer.ts";

function frame(partial: Partial<DesignerFrame> = {}): DesignerFrame {
  return {
    id: "f1",
    name: "Phase 1",
    objects: [],
    actions: [],
    ...partial,
  };
}

test("resolveFrameAnimDurationSec defaults to 1 second", () => {
  assert.equal(resolveFrameAnimDurationSec(frame()), DEFAULT_FRAME_ANIM_DURATION_SEC);
});

test("frameActionStepDurationMs splits frame duration across steps", () => {
  const ms = frameActionStepDurationMs(frame({ animDurationSec: 2 }), 4, 1);
  assert.equal(ms, 500);
});

test("frameActionStepDurationMs respects playback speed", () => {
  const ms = frameActionStepDurationMs(frame({ animDurationSec: 1 }), 2, 2);
  assert.equal(ms, 250);
});
