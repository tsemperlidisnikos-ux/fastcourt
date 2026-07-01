import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStrokeVisibleAt,
  LASER_HOLD_SEC,
  visibleStrokesAt,
} from "@/lib/film-room/annotation-visibility";
import type { VideoAnnotationStroke } from "@/types/film-room";

function stroke(
  partial: Partial<VideoAnnotationStroke> & Pick<VideoAnnotationStroke, "time" | "kind">,
): VideoAnnotationStroke {
  return {
    id: "s1",
    points: [0.1, 0.1, 0.5, 0.5],
    color: "#000",
    width: 4,
    ...partial,
  };
}

describe("film room annotation visibility", () => {
  it("hides pen strokes before their anchor time", () => {
    const s = stroke({ time: 10, kind: "pen" });
    assert.equal(isStrokeVisibleAt(s, 9.9), false);
    assert.equal(isStrokeVisibleAt(s, 10), true);
    assert.equal(isStrokeVisibleAt(s, 120), true);
  });

  it("fades laser strokes after hold window", () => {
    const s = stroke({ time: 5, kind: "laser" });
    assert.equal(isStrokeVisibleAt(s, 5), true);
    assert.equal(isStrokeVisibleAt(s, 5 + LASER_HOLD_SEC), true);
    assert.equal(isStrokeVisibleAt(s, 5 + LASER_HOLD_SEC + 0.1), false);
  });

  it("filters visible strokes for playback time", () => {
    const strokes = [
      stroke({ id: "a", time: 2, kind: "pen" }),
      stroke({ id: "b", time: 8, kind: "pen" }),
      stroke({ id: "c", time: 4, kind: "laser" }),
    ];
    const atSix = visibleStrokesAt(strokes, 6);
    assert.deepEqual(
      atSix.map((s) => s.id),
      ["a", "c"],
    );
  });
});
