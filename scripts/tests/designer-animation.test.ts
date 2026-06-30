import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAnimationSteps,
  computeAnimStepState,
  computeFrameObjectsAfterSteps,
  getPlaybackActionIds,
} from "@/lib/designer/animation-engine";
import {
  getAnimationExportDurationMs,
  playHasExportableAnimation,
  samplePlayAnimationAt,
} from "@/lib/designer/animation-export";
import { makeAction, makeFrame, offense } from "./helpers";

describe("animation engine", () => {
  it("getPlaybackActionIds skips optional actions", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.5, 0.6, true)],
      [
        { ...makeAction("pass", 0.5, 0.6, 0.3, 0.4, "p1"), timing: "optional" },
        makeAction("cut", 0.3, 0.4, 0.4, 0.3, "c1"),
      ],
    );
    const ids = getPlaybackActionIds(frame);
    assert.deepEqual(ids, ["c1"]);
  });

  it("computeFrameObjectsAfterSteps applies pass mid-sequence", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.5, 0.6, true), offense("o2", "2", 0.3, 0.4)],
      [makeAction("pass", 0.5, 0.6, 0.3, 0.4, "p1")],
    );

    const step0 = computeFrameObjectsAfterSteps(frame, 0);
    assert.equal(step0.find((o) => o.label === "1")?.hasBall, true);

    const step1 = computeFrameObjectsAfterSteps(frame, 1);
    assert.equal(step1.find((o) => o.label === "2")?.hasBall, true);
    assert.equal(step1.find((o) => o.label === "1")?.hasBall, false);
  });

  it("buildAnimationSteps groups consecutive sync actions", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.5, 0.6, true)],
      [
        makeAction("cut", 0.5, 0.6, 0.6, 0.5, "c1"),
        { ...makeAction("dribble", 0.3, 0.4, 0.4, 0.3, "d1"), timing: "sync" },
        { ...makeAction("cut", 0.2, 0.2, 0.3, 0.3, "c2"), timing: "sync" },
        makeAction("pass", 0.5, 0.6, 0.3, 0.4, "p1"),
      ],
    );

    const steps = buildAnimationSteps(frame);
    assert.equal(steps.length, 3);
    assert.deepEqual(steps[0].actionIds, ["c1"]);
    assert.deepEqual(steps[1].actionIds, ["d1", "c2"]);
    assert.equal(steps[1].timing, "sync");
    assert.deepEqual(steps[2].actionIds, ["p1"]);
  });

  it("computeAnimStepState exposes multiple active actions for sync step", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.5, 0.6, true)],
      [
        { ...makeAction("cut", 0.5, 0.6, 0.6, 0.5, "c1"), timing: "sync" },
        { ...makeAction("dribble", 0.3, 0.4, 0.4, 0.3, "d1"), timing: "sync" },
      ],
    );
    frame.actionSequence = ["c1", "d1"];

    const state = computeAnimStepState(frame, 0, 0.5, 0.5);
    assert.deepEqual(state.activeActionIds, ["c1", "d1"]);
    assert.equal(state.activeActionId, "c1");
  });

  it("computeAnimStepState moves player along curved cut path", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.2, 0.5, true)],
      [
        {
          ...makeAction("cut", 0.2, 0.5, 0.8, 0.5, "c1"),
          midX: 0.5,
          midY: 0.35,
        },
      ],
    );
    const start = computeAnimStepState(frame, 0, 0, 0);
    const mid = computeAnimStepState(frame, 0, 0.5, 0.5);
    const end = computeAnimStepState(frame, 0, 1, 1);
    const player = (state: typeof start) =>
      state.objects.find((o) => o.label === "1")!;

    assert.equal(player(start).x, 0.2);
    assert.equal(player(start).y, 0.5);
    assert.equal(player(end).x, 0.8);
    assert.equal(player(end).y, 0.5);
    assert.ok(player(mid).y < 0.5, "mid animation should follow curve bulge upward");
    assert.notEqual(player(mid).y, 0.5, "player should not lerp in a straight line");
  });
});

describe("free curve peak", () => {
  it("cut curve passes through dragged peak at t=0.5", async () => {
    const { buildActionCurveRenderPoints, pointAlongNormPolyline } = await import(
      "@/lib/designer/action-geometry"
    );
    const action = {
      type: "cut" as const,
      x1: 0.2,
      y1: 0.5,
      x2: 0.8,
      y2: 0.5,
      midX: 0.5,
      midY: 0.35,
    };
    const pts = buildActionCurveRenderPoints(action);
    const mid = pointAlongNormPolyline(pts, 0.5);
    assert.ok(Math.abs(mid.x - 0.5) < 0.01);
    assert.ok(Math.abs(mid.y - 0.35) < 0.01);
  });
});

describe("animation export", () => {
  it("playHasExportableAnimation requires at least one action", () => {
    const empty = {
      id: "p1",
      title: "Empty",
      courtType: "half" as const,
      frames: [makeFrame([offense("o1", "1", 0.5, 0.6)], [])],
    };
    const withAction = {
      ...empty,
      frames: [
        makeFrame(
          [offense("o1", "1", 0.5, 0.6, true)],
          [makeAction("cut", 0.5, 0.6, 0.6, 0.4, "c1")],
        ),
      ],
    };
    assert.equal(playHasExportableAnimation(empty), false);
    assert.equal(playHasExportableAnimation(withAction), true);
  });

  it("samplePlayAnimationAt advances ball holder mid-play", () => {
    const play = {
      id: "p1",
      title: "Pass",
      courtType: "half" as const,
      frames: [
        makeFrame(
          [offense("o1", "1", 0.5, 0.6, true), offense("o2", "2", 0.3, 0.4)],
          [makeAction("pass", 0.5, 0.6, 0.3, 0.4, "p1")],
        ),
      ],
    };
    const start = samplePlayAnimationAt(play, 0);
    const end = samplePlayAnimationAt(play, getAnimationExportDurationMs(play) - 1);
    assert.ok(start);
    assert.ok(end);
    assert.equal(start!.runtime.objects.find((o) => o.label === "1")?.hasBall, true);
    assert.equal(end!.runtime.objects.find((o) => o.label === "2")?.hasBall, true);
  });
});
