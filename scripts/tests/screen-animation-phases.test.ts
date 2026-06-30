import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeAnimStepStateAtEased } from "@/lib/designer/animation-engine";
import {
  resolvePlaybackSpeed,
  resolveStepAnimPhases,
} from "@/lib/designer/animation-timing";
import { makeAction, makeFrame, offense } from "./helpers";

describe("action animation phases", () => {
  for (const actionType of ["screen", "cut", "pass", "dribble"] as const) {
    it(`resolveStepAnimPhases draws line before player moves (${actionType})`, () => {
      const early = resolveStepAnimPhases(actionType, 0.2);
      assert.equal(early.showActiveLine, true);
      assert.ok(early.lineProgress > 0);
      assert.equal(early.stepProgress, 0);

      const erase = resolveStepAnimPhases(actionType, 0.4);
      assert.equal(erase.showActiveLine, false);
      assert.equal(erase.stepProgress, 0);

      const move = resolveStepAnimPhases(actionType, 0.8);
      assert.equal(move.showActiveLine, false);
      assert.ok(move.stepProgress > 0);
    });
  }

  it("resolvePlaybackSpeed defaults to 0.1x and migrates legacy defaults", () => {
    assert.equal(resolvePlaybackSpeed(undefined), 0.1);
    assert.equal(resolvePlaybackSpeed(1), 0.1);
    assert.equal(resolvePlaybackSpeed(0.4), 0.1);
    assert.equal(resolvePlaybackSpeed(0.5), 0.5);
  });

  it("computeAnimStepStateAtEased only exposes the active step line", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.2, 0.5), offense("o2", "2", 0.7, 0.5)],
      [
        makeAction("cut", 0.2, 0.5, 0.55, 0.45, "a1"),
        makeAction("pass", 0.7, 0.5, 0.4, 0.3, "a2"),
      ],
    );

    const step0 = computeAnimStepStateAtEased(frame, 0, 0.2);
    assert.deepEqual(step0.revealedActionIds, []);
    assert.equal(step0.activeActionId, "a1");

    const step1 = computeAnimStepStateAtEased(frame, 1, 0.2);
    assert.deepEqual(step1.revealedActionIds, []);
    assert.equal(step1.activeActionId, "a2");
  });

  it("computeAnimStepStateAtEased keeps mover still while line draws", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.2, 0.5), offense("o2", "2", 0.7, 0.5)],
      [makeAction("screen", 0.2, 0.5, 0.55, 0.45, "s1")],
    );

    const draw = computeAnimStepStateAtEased(frame, 0, 0.2);
    const mover = draw.objects.find((o) => o.label === "1")!;
    assert.equal(draw.showActiveLine, true);
    assert.equal(mover.x, 0.2);
    assert.equal(mover.y, 0.5);

    const moving = computeAnimStepStateAtEased(frame, 0, 0.9);
    assert.equal(moving.showActiveLine, false);
    const moved = moving.objects.find((o) => o.label === "1")!;
    assert.ok(Math.hypot(moved.x - 0.2, moved.y - 0.5) > 0.01);
  });
});
