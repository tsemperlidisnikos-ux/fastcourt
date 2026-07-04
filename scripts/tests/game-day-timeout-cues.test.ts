import assert from "node:assert/strict";
import test from "node:test";
import { createGamePlanDraft } from "../../src/lib/game-plan/game-plan-items.ts";
import {
  counterToTimeoutCue,
  mergeTimeoutCues,
  pickTopTimeoutCues,
} from "../../src/lib/game-plan/game-day-timeout-cues.ts";
import { buildTimeoutViewSlides } from "../../src/lib/game-plan/timeout-mode.ts";
import type { StoredPlay } from "../../src/types/library.ts";

function stubPlay(id: string, title: string): StoredPlay {
  return {
    id,
    title,
    courtType: "half",
    frames: [{ id: "f1", name: "Frame 1", objects: [], actions: [], actionSequence: [] }],
    type: "play",
    tags: ["defense", "ato"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("mergeTimeoutCues dedupes and sorts by priority", () => {
  const existing = [
    counterToTimeoutCue({
      title: "Drop",
      detail: "Drop big.",
      coverage: "drop",
      priority: "medium",
    }),
  ];
  const incoming = [
    counterToTimeoutCue({
      title: "ICE",
      detail: "Force baseline.",
      coverage: "ice",
      targetsPattern: "PNR",
      priority: "high",
    }),
    counterToTimeoutCue({
      title: "ICE",
      detail: "Duplicate.",
      coverage: "ice",
      targetsPattern: "PNR",
      priority: "high",
    }),
  ];
  const merged = mergeTimeoutCues(existing, incoming);
  assert.equal(merged.length, 2);
  assert.equal(merged[0]?.coverage, "ice");
});

test("pickTopTimeoutCues returns at most limit", () => {
  const cues = mergeTimeoutCues(undefined, [
    counterToTimeoutCue({ title: "A", detail: "a", coverage: "ice", priority: "low" }),
    counterToTimeoutCue({ title: "B", detail: "b", coverage: "blitz", priority: "high" }),
    counterToTimeoutCue({ title: "C", detail: "c", coverage: "switch", priority: "medium" }),
    counterToTimeoutCue({ title: "D", detail: "d", coverage: "drop", priority: "high" }),
  ]);
  assert.equal(pickTopTimeoutCues(cues, 2).length, 2);
});

test("buildTimeoutViewSlides puts counters before play calls", () => {
  const plan = createGamePlanDraft("Rival", "Varsity");
  plan.timeoutCues = [
    counterToTimeoutCue({
      title: "ICE side",
      detail: "Force baseline.",
      coverage: "ice",
      targetsPattern: "PNR",
    }),
  ];
  plan.entries = [
    {
      id: "gpe_1",
      categoryId: "ato",
      playId: "p_ato",
      callName: "ATO 1",
    },
  ];
  const slides = buildTimeoutViewSlides(plan, new Map([["p_ato", stubPlay("p_ato", "ATO Quick")]]));
  assert.equal(slides.length, 2);
  assert.equal(slides[0]?.kind, "counter");
  assert.equal(slides[1]?.kind, "play");
});
