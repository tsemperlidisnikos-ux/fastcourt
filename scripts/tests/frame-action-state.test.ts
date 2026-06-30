import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { objectsAfterFrameActions } from "@/lib/designer/frame-propagation";
import { snapScreenEndpoints } from "@/lib/designer/player-edge-snap";
import { makeAction, offense } from "./helpers";
import type { DesignerFrame } from "@/types/designer";

function makeFrame(
  objects: DesignerFrame["objects"],
  actions: DesignerFrame["actions"],
): DesignerFrame {
  return {
    id: "frame-1",
    name: "Frame 1",
    objects,
    actions,
    actionSequence: actions.map((a) => a.id),
    whiteboardStrokes: [],
  };
}

describe("objectsAfterFrameActions", () => {
  it("transfers ball after pass", () => {
    const objects = [
      offense("o1", "1", 0.2, 0.75, true),
      offense("o2", "2", 0.8, 0.75),
    ];
    const pass = makeAction("pass", 0.2, 0.75, 0.8, 0.75, "p1");
    const frame = makeFrame(objects, [pass]);
    const after = objectsAfterFrameActions(frame);

    assert.equal(after.find((o) => o.id === "o1")?.hasBall, false);
    assert.equal(after.find((o) => o.id === "o2")?.hasBall, true);
  });

  it("lets passer screen after pass using propagated ball state", () => {
    const objects = [
      offense("o1", "1", 0.2, 0.75, true),
      offense("o2", "2", 0.8, 0.75),
    ];
    const pass = makeAction("pass", 0.2, 0.75, 0.8, 0.75, "p1");
    const frame = makeFrame(objects, [pass]);
    const after = objectsAfterFrameActions(frame);

    const snapped = snapScreenEndpoints(0.2, 0.75, 0.5, 0.55, after, [pass]);
    assert.ok(Math.hypot(snapped.x1 - 0.2, snapped.y1 - 0.75) > 0.01);
    assert.equal(snapped.x2, 0.5);
    assert.equal(snapped.y2, 0.55);
  });

  it("lets passer screen for a third player after pass", () => {
    const objects = [
      offense("o1", "1", 0.2, 0.75, true),
      offense("o2", "2", 0.8, 0.75),
      offense("o3", "3", 0.5, 0.45),
    ];
    const pass = makeAction("pass", 0.2, 0.75, 0.8, 0.75, "p1");
    const frame = makeFrame(objects, [pass]);
    const after = objectsAfterFrameActions(frame);

    const snapped = snapScreenEndpoints(0.2, 0.75, 0.48, 0.42, after, [pass]);
    assert.ok(Math.hypot(snapped.x1 - 0.2, snapped.y1 - 0.75) > 0.01);
    assert.equal(snapped.x2, 0.48);
    assert.equal(snapped.y2, 0.42);
  });
});
