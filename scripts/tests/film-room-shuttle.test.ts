import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  angleDeltaToSeekSeconds,
  clampSeekTime,
  normalizeAngleDelta,
} from "@/lib/film-room/shuttle-wheel";

describe("film room shuttle wheel", () => {
  it("normalizes angle wraparound", () => {
    assert.ok(
      Math.abs(normalizeAngleDelta(Math.PI + 0.5) - (-Math.PI + 0.5)) < 0.001,
    );
    assert.ok(
      Math.abs(normalizeAngleDelta(-Math.PI - 0.5) - (Math.PI - 0.5)) < 0.001,
    );
  });

  it("maps rotation to seek seconds", () => {
    assert.equal(angleDeltaToSeekSeconds(0), 0);
    const quarterTurn = angleDeltaToSeekSeconds(Math.PI / 2);
    assert.ok(Math.abs(quarterTurn - 2) < 0.001);
    const halfTurn = angleDeltaToSeekSeconds(Math.PI);
    assert.ok(Math.abs(halfTurn - 4) < 0.001);
  });

  it("clamps seek time to duration", () => {
    assert.equal(clampSeekTime(-2, 60), 0);
    assert.equal(clampSeekTime(90, 60), 60);
    assert.equal(clampSeekTime(12.5, 60), 12.5);
  });
});
