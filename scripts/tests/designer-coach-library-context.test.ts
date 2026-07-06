import assert from "node:assert/strict";
import {
  buildDesignerCoachLibraryContext,
  mergeAiGroundedAlternatives,
} from "../../src/lib/designer/designer-coach-library-context";
import { parseDesignerCoachPayload } from "../../src/lib/designer/designer-coach-prompt";
import type { StoredPlay } from "../../src/types/library";

const current = {
  id: "current",
  title: "PNR Side",
  courtType: "half" as const,
  frames: [
    {
      id: "f1",
      objects: [
        { id: "o1", kind: "offense" as const, x: 0.5, y: 0.7, label: "1" },
        { id: "o2", kind: "offense" as const, x: 0.8, y: 0.35, label: "2" },
        { id: "o3", kind: "offense" as const, x: 0.2, y: 0.35, label: "3" },
        { id: "o4", kind: "offense" as const, x: 0.65, y: 0.2, label: "4" },
        { id: "o5", kind: "offense" as const, x: 0.35, y: 0.2, label: "5" },
      ],
      actions: [{ id: "a1", type: "screen" as const, x1: 0.5, y1: 0.7, x2: 0.55, y2: 0.62 }],
      actionSequence: ["a1"],
    },
  ],
};

const library: StoredPlay[] = [
  {
    id: "alt-1",
    title: "PNR Alt",
    type: "play",
    courtType: "half",
    series: "PNR",
    frames: current.frames,
    updatedAt: "",
    createdAt: "",
  },
];

const context = buildDesignerCoachLibraryContext(current, library);
assert.equal(context[0]?.playId, "alt-1");

const parsed = parseDesignerCoachPayload(
  {
    coaching: {
      alternativeOptions: [
        {
          title: "Try flare",
          detail: "Weak-side lift",
          priority: "medium",
          playId: "alt-1",
        },
      ],
    },
  },
  undefined,
  context,
);
assert.equal(parsed.aiLibraryAlternatives[0]?.playId, "alt-1");

const merged = mergeAiGroundedAlternatives(
  [],
  parsed.aiLibraryAlternatives,
  library,
);
assert.equal(merged[0]?.kind, "library");
assert.equal(merged[0]?.playId, "alt-1");

console.log("designer-coach-library-context.test.ts OK");
