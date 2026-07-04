import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampShuttlePosition,
  defaultShuttlePosition,
  SHUTTLE_WHEEL_SIZE_PX,
} from "@/lib/film-room/shuttle-position";

describe("film room shuttle position", () => {
  it("clamps widget inside bounds", () => {
    const size = SHUTTLE_WHEEL_SIZE_PX;
    const clamped = clampShuttlePosition(-20, 999, 640, 360, size, size);
    assert.equal(clamped.x, 0);
    assert.equal(clamped.y, 360 - size);
  });

  it("picks a default position above the bottom dock", () => {
    const pos = defaultShuttlePosition(800, 450);
    assert.ok(pos.x >= 0);
    assert.ok(pos.y >= 0);
    assert.ok(pos.y < 450 - SHUTTLE_WHEEL_SIZE_PX);
  });
});
