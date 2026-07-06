import assert from "node:assert/strict";
import { analyzePlayLocally } from "../../src/lib/designer/analyze-play-locally";
import { applyFixesToFrame } from "../../src/lib/designer/designer-coach-apply";
import type { StoredPlay } from "../../src/types/library";
function makePlay(overrides: Partial<StoredPlay> = {}): StoredPlay {
  return {
    id: "play-test",
    title: "PNR Side",
    type: "play",
    courtType: "half",
    frames: [
      {
        id: "f1",
        name: "Frame 1",
        objects: [
          { id: "o1", kind: "offense", x: 0.5, y: 0.7, label: "1", hasBall: true },
          { id: "o2", kind: "offense", x: 0.52, y: 0.71, label: "2" },
          { id: "o3", kind: "offense", x: 0.48, y: 0.72, label: "3" },
          { id: "o4", kind: "offense", x: 0.8, y: 0.35, label: "4" },
          { id: "o5", kind: "offense", x: 0.2, y: 0.35, label: "5" },
        ],
        actions: [
          {
            id: "a1",
            type: "screen",
            x1: 0.5,
            y1: 0.7,
            x2: 0.55,
            y2: 0.62,
          },
          { id: "a2", type: "cut", x1: 0.2, y1: 0.35, x2: 0.35, y2: 0.55 },
          { id: "a3", type: "pass", x1: 0.5, y1: 0.7, x2: 0.8, y2: 0.35 },
          { id: "a4", type: "dribble", x1: 0.5, y1: 0.7, x2: 0.45, y2: 0.6 },
        ],
        actionSequence: ["a1", "a2", "a3", "a4"],
        animDurationSec: 1,
      },
    ],
    tags: ["pnr"],
    series: "PNR",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const result = analyzePlayLocally(makePlay(), 0, []);
assert.ok(result.inferredPatterns.includes("PNR"));
assert.ok(
  result.coaching.spacingFixes.length > 0 ||
    result.coaching.timingCorrections.length > 0,
  "expected spacing or timing suggestions for tight cluster",
);
assert.ok(result.coaching.counters.length > 0, "expected counter guidance for PNR");
assert.ok(result.bundles.length > 0, "expected apply bundles");
const spacingWithFixes = result.bundles.filter(
  (bundle) => bundle.category === "spacingFixes" && bundle.fixes.length > 0,
);
assert.ok(spacingWithFixes.length > 0, "expected spacing bundles with court fixes");
const timingWithFixes = result.bundles.filter(
  (bundle) => bundle.category === "timingCorrections" && bundle.fixes.length > 0,
);
assert.ok(timingWithFixes.length > 0, "expected timing bundles with duration fix");

const defenseWithFixes = result.bundles.filter(
  (bundle) =>
    bundle.category === "defensiveAdjustments" && bundle.fixes.length > 0,
);
assert.ok(defenseWithFixes.length > 0, "expected defense bundles with court fixes");

const frame = makePlay().frames[0]!;
const allFixes = result.bundles.flatMap((bundle) => bundle.fixes);
const patched = applyFixesToFrame(frame, allFixes);
assert.ok(
  patched.objects.some((object) => object.kind === "defense"),
  "apply should add defense markers for light shell",
);
assert.ok(
  (patched.animDurationSec ?? 0) > (frame.animDurationSec ?? 0),
  "apply should lengthen fast frame duration",
);

console.log("designer-coach-local.test.ts OK");
