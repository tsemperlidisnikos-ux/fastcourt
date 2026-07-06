import assert from "node:assert/strict";
import { cloneFrameForImport } from "../../src/lib/designer/designer-coach-import-frame";
import type { DesignerFrame } from "../../src/types/designer";

const source: DesignerFrame = {
  id: "f-src",
  name: "Source",
  objects: [
    { id: "o1", kind: "offense", x: 0.5, y: 0.7, label: "1", hasBall: true },
    { id: "o2", kind: "defense", x: 0.52, y: 0.6, label: "1", defenseStyle: "mark" },
  ],
  actions: [
    { id: "a1", type: "pass", x1: 0.5, y1: 0.7, x2: 0.8, y2: 0.35 },
  ],
  actionSequence: ["a1"],
  animDurationSec: 1.5,
  readBranch: {
    parentFrameId: "parent",
    coverage: "ice",
    label: "If ICE",
  },
};

const imported = cloneFrameForImport(source, { frameName: "Frame 2" });

assert.notEqual(imported.id, source.id);
assert.equal(imported.name, "Frame 2");
assert.equal(imported.objects.length, 2);
assert.ok(imported.objects.every((object) => object.id !== "o1" && object.id !== "o2"));
assert.equal(imported.actions.length, 1);
assert.notEqual(imported.actions[0]?.id, "a1");
assert.equal(imported.actionSequence?.[0], imported.actions[0]?.id);
assert.equal(imported.readBranch, undefined);

console.log("designer-coach-import-frame.test.ts OK");
