import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  guardHandleStageOffset,
  guardHitRadius,
  guardRotationFromStagePoint,
  normalizeDefenseMarkerStyle,
} from "../../src/lib/designer/defense-marker-style.ts";

describe("defense guard marker", () => {
  it("normalizes marker style", () => {
    assert.equal(normalizeDefenseMarkerStyle(undefined), "mark");
    assert.equal(normalizeDefenseMarkerStyle("guard"), "guard");
    assert.equal(normalizeDefenseMarkerStyle("mark"), "mark");
  });

  it("maps handle position to rotation with 0° toward top", () => {
    assert.equal(guardRotationFromStagePoint(100, 100, 100, 60), 0);
    assert.equal(Math.round(guardRotationFromStagePoint(100, 100, 140, 100)), 90);
  });

  it("places rotation handle on dashed guide circle", () => {
    const ringRadius = 7.2;
    const up = guardHandleStageOffset(ringRadius, 0);
    const right = guardHandleStageOffset(ringRadius, 90);
    const guideRadius = guardHitRadius(ringRadius);
    assert.ok(Math.abs(up.dx) < 0.01);
    assert.ok(Math.abs(up.dy + guideRadius) < 0.01);
    assert.ok(Math.abs(right.dx - guideRadius) < 0.01);
    assert.ok(Math.abs(right.dy) < 0.01);
  });
});
