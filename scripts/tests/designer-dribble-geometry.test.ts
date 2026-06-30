import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actionToNormPoints,
  buildDribblePoints,
} from "@/lib/designer/action-geometry";
import { makeAction } from "./helpers";

describe("dribble geometry", () => {
  it("builds a zig-zag polyline in stage pixels", () => {
    const points = buildDribblePoints(100, 300, 500, 280, 300, 420, 1);
    assert.ok(points.length > 8, "expected zig-zag polyline, not a straight segment");
    assert.notDeepEqual(points, [100, 300, 500, 280]);
    // alternating perpendicular offsets (true zig-zag, not smooth sine)
    const perpSigns: number[] = [];
    for (let i = 2; i < points.length - 4; i += 2) {
      const dx = points[i]! - points[i - 2]!;
      const dy = points[i + 1]! - points[i - 1]!;
      const segLen = Math.hypot(dx, dy) || 1;
      const px = -dy / segLen;
      const py = dx / segLen;
      const ox = points[i]! - (points[i - 2]! + dx * 0.5);
      const oy = points[i + 1]! - (points[i - 1]! + dy * 0.5);
      const sign = Math.sign(ox * px + oy * py);
      if (sign !== 0) perpSigns.push(sign);
    }
    assert.ok(perpSigns.length >= 2, "expected multiple zig-zag peaks");
    assert.ok(
      perpSigns.some((s, idx) => idx > 0 && s !== perpSigns[idx - 1]),
      "expected alternating side offsets",
    );
  });

  it("actionToNormPoints returns wavy dribble path", () => {
    const action = makeAction("dribble", 0.2, 0.5, 0.7, 0.5, "d1");
    const points = actionToNormPoints(action, "half");
    assert.ok(points.length > 8);
  });
});
