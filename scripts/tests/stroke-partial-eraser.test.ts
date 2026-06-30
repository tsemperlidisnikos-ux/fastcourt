import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  erasePartialAtPoint,
  eraseStrokesAt,
} from "@/lib/designer/stroke-partial-eraser";

describe("stroke partial eraser", () => {
  it("leaves stroke unchanged when eraser misses", () => {
    const stroke = { points: [0, 0.5, 1, 0.5], color: "#000", width: 3 };
    const next = erasePartialAtPoint(stroke, 0.5, 0.1, 0.02, 0.004);
    assert.equal(next.length, 1);
    assert.deepEqual(next[0].points, stroke.points);
  });

  it("splits a horizontal line when erasing the middle", () => {
    const stroke = { points: [0, 0.5, 1, 0.5], color: "#000", width: 3 };
    const next = erasePartialAtPoint(stroke, 0.5, 0.5, 0.08, 0.004);
    assert.equal(next.length, 2);
    for (const part of next) {
      assert.ok(part.points.length >= 4);
      for (let i = 0; i < part.points.length; i += 2) {
        assert.ok(Math.abs(part.points[i + 1] - 0.5) < 0.01);
        assert.ok(Math.abs(part.points[i] - 0.5) > 0.02);
      }
    }
  });

  it("removes a dot stroke when fully covered", () => {
    const stroke = { points: [0.5, 0.5], color: "#000", width: 3 };
    const next = erasePartialAtPoint(stroke, 0.5, 0.5, 0.02, 0.004);
    assert.equal(next.length, 0);
  });

  it("processes multiple strokes independently", () => {
    const strokes = [
      { points: [0, 0.2, 1, 0.2], color: "#f00", width: 3 },
      { points: [0, 0.8, 1, 0.8], color: "#00f", width: 3 },
    ];
    const next = eraseStrokesAt(strokes, 0.5, 0.2, 0.08);
    assert.equal(next.length, 3);
    assert.equal(next.filter((s) => s.color === "#f00").length, 2);
    assert.equal(next.filter((s) => s.color === "#00f").length, 1);
  });
});
