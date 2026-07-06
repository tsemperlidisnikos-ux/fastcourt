import assert from "node:assert/strict";
import { parseAiCoachApplyBundles } from "../../src/lib/designer/designer-coach-ai-apply";
import { buildCoachPreviewGhosts } from "../../src/lib/designer/designer-coach-preview";
import type { DesignerFrame } from "../../src/types/designer";

const frame: DesignerFrame = {
  id: "f1",
  name: "Frame 1",
  objects: [
    { id: "o1", kind: "offense", x: 0.5, y: 0.7, label: "1", hasBall: true },
    { id: "o2", kind: "offense", x: 0.52, y: 0.71, label: "2" },
  ],
  actions: [{ id: "a1", type: "screen", x1: 0.5, y1: 0.7, x2: 0.55, y2: 0.62 }],
  actionSequence: ["a1"],
  animDurationSec: 1,
};

const bundles = parseAiCoachApplyBundles(
  [
    {
      category: "spacingFixes",
      title: "Widen 1 and 2",
      detail: "Create a driving lane.",
      priority: "high",
      fixes: [
        { type: "move", objectLabel: "2", x: 0.62, y: 0.68 },
        {
          type: "addDefense",
          x: 0.55,
          y: 0.62,
          label: "3",
          defenseStyle: "mark",
        },
      ],
    },
  ],
  frame,
);

assert.equal(bundles.length, 1);
assert.equal(bundles[0]?.fixes.length, 2);
assert.equal(bundles[0]?.fixes[0]?.type, "move");
if (bundles[0]?.fixes[0]?.type === "move") {
  assert.equal(bundles[0].fixes[0].objectId, "o2");
}

const ghosts = buildCoachPreviewGhosts(frame, bundles[0]!.fixes);
assert.ok(ghosts.length >= 2, "expected move and addDefense ghosts");
assert.ok(
  ghosts.some((ghost) => ghost.fromX != null),
  "move ghost should include origin",
);

console.log("designer-coach-phase3.test.ts OK");
