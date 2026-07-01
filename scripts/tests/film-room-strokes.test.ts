import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countPenStrokes,
  isPenStroke,
  withoutPenStrokes,
} from "@/lib/film-room/film-room-strokes";
import type { VideoAnnotationStroke } from "@/types/film-room";

function stroke(kind: "pen" | "laser"): VideoAnnotationStroke {
  return {
    id: kind,
    time: 0,
    points: [0.1, 0.1, 0.2, 0.2],
    color: "#000",
    width: 4,
    kind,
  };
}

describe("film room pen strokes", () => {
  it("treats pen and legacy strokes as pencil drawings", () => {
    const legacy = { ...stroke("pen"), kind: undefined as unknown as "pen" };
    assert.equal(isPenStroke(stroke("pen")), true);
    assert.equal(isPenStroke(legacy), true);
    assert.equal(isPenStroke(stroke("laser")), false);
  });

  it("removes only pen strokes on clear pencil", () => {
    const strokes = [stroke("pen"), stroke("laser"), stroke("pen")];
    assert.equal(countPenStrokes(strokes), 2);
    assert.deepEqual(withoutPenStrokes(strokes).map((s) => s.id), ["laser"]);
  });
});
