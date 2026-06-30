import test from "node:test";
import assert from "node:assert/strict";
import { formatActionTimelineLabel } from "../../src/lib/designer/action-timeline-label.ts";
import type { DesignerAction, DesignerFrame } from "../../src/types/designer.ts";

function frameWithPlayers(): DesignerFrame {
  return {
    id: "f1",
    name: "Phase 1",
    objects: [
      { id: "p1", kind: "offense", x: 0.2, y: 0.5, label: "1", hasBall: true },
      { id: "p2", kind: "offense", x: 0.8, y: 0.5, label: "2" },
    ],
    actions: [],
  };
}

function action(partial: Partial<DesignerAction> & Pick<DesignerAction, "type">): DesignerAction {
  return {
    id: "a1",
    x1: 0.2,
    y1: 0.5,
    x2: 0.8,
    y2: 0.5,
    ...partial,
  };
}

test("formatActionTimelineLabel — pass with two players", () => {
  const frame = frameWithPlayers();
  const label = formatActionTimelineLabel(action({ type: "pass" }), frame);
  assert.equal(label, "Pass by Player 1 to Player 2");
});

test("formatActionTimelineLabel — cut with start player", () => {
  const frame = frameWithPlayers();
  const label = formatActionTimelineLabel(
    action({ type: "cut", x2: 0.4, y2: 0.3 }),
    frame,
  );
  assert.equal(label, "Cut by Player 1");
});

test("formatActionTimelineLabel — unknown player falls back to type", () => {
  const frame: DesignerFrame = {
    id: "f1",
    name: "Empty",
    objects: [],
    actions: [],
  };
  const label = formatActionTimelineLabel(action({ type: "screen" }), frame);
  assert.equal(label, "Screen");
});
