import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertActionType } from "@/lib/designer/action-convert";
import { makeAction } from "./helpers";

describe("convertActionType", () => {
  it("converts dribble to pass with straight endpoints", () => {
    const action = {
      ...makeAction("dribble", 0.2, 0.5, 0.7, 0.5, "d1"),
      midX: 0.45,
      midY: 0.62,
      points: [0.2, 0.5, 0.3, 0.55, 0.7, 0.5],
    };
    const next = convertActionType(action, "pass");
    assert.equal(next.type, "pass");
    assert.equal(next.x1, 0.2);
    assert.equal(next.x2, 0.7);
    assert.equal(next.points, undefined);
    assert.equal(next.c1x, undefined);
  });

  it("converts pass to cut with default curve controls", () => {
    const action = makeAction("pass", 0.5, 0.6, 0.3, 0.4, "p1");
    const next = convertActionType(action, "cut");
    assert.equal(next.type, "cut");
    assert.ok(next.c1x != null && next.c2x != null);
  });

  it("preserves bulge when converting cut to curl", () => {
    const action = {
      ...makeAction("cut", 0.5, 0.7, 0.6, 0.4, "c1"),
      c1x: 0.52,
      c1y: 0.55,
      c2x: 0.58,
      c2y: 0.55,
    };
    const next = convertActionType(action, "curl");
    assert.equal(next.type, "curl");
    assert.ok(next.c1y != null && next.c1y > 0.5);
  });
});
