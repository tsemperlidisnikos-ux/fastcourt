import assert from "node:assert/strict";
import test from "node:test";
import { createGamePlanDraft } from "../../src/lib/game-plan/game-plan-items.ts";
import {
  TIMEOUT_CUES_MAX,
  addTimeoutCue,
  counterToTimeoutCue,
  createManualTimeoutCue,
  listCounterLibraryPlays,
  mergeTimeoutCues,
  patchTimeoutCue,
  pickTopTimeoutCues,
  removeTimeoutCue,
  timeoutCueFromCounterLibraryPlay,
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

test("createManualTimeoutCue requires title and detail", () => {
  assert.equal(
    createManualTimeoutCue({ title: "", detail: "x", coverage: "ice" }),
    null,
  );
  const cue = createManualTimeoutCue({
    title: "ICE side",
    detail: "Force baseline.",
    coverage: "ice",
    targetsPattern: "PNR",
    priority: "high",
    ballHandlerRule: "No middle",
  });
  assert.ok(cue);
  assert.equal(cue?.title, "ICE side");
  assert.equal(cue?.ballHandlerRule, "No middle");
});

test("timeoutCueFromCounterLibraryPlay maps defenseCounter meta", () => {
  const play = stubPlay("def_ice", "Team ICE");
  play.defenseCounter = {
    enabled: true,
    coverages: ["ice"],
    vsPatterns: ["PNR"],
    notes: "Prefer vs lefty BH",
  };
  const cue = timeoutCueFromCounterLibraryPlay(play);
  assert.ok(cue);
  assert.equal(cue?.defensePlayId, "def_ice");
  assert.equal(cue?.coverage, "ice");
  assert.equal(cue?.targetsPattern, "PNR");
  assert.equal(cue?.detail, "Prefer vs lefty BH");
});

test("listCounterLibraryPlays filters enabled counters", () => {
  const ice = stubPlay("a", "ICE");
  ice.defenseCounter = { enabled: true, coverages: ["ice"], vsPatterns: [] };
  const plain = stubPlay("b", "Plain");
  const drill = stubPlay("c", "Drill");
  drill.type = "drill";
  drill.defenseCounter = { enabled: true, coverages: ["drop"], vsPatterns: [] };
  const listed = listCounterLibraryPlays([plain, drill, ice]);
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.id, "a");
});

test("patchTimeoutCue and removeTimeoutCue update the list", () => {
  const first = counterToTimeoutCue({
    title: "ICE",
    detail: "Force baseline.",
    coverage: "ice",
    priority: "low",
  });
  const second = counterToTimeoutCue({
    title: "Drop",
    detail: "Drop big.",
    coverage: "drop",
    priority: "medium",
  });
  let cues = mergeTimeoutCues(undefined, [first, second]);
  cues = patchTimeoutCue(cues, first.id, {
    priority: "high",
    detail: "Force baseline hard.",
  });
  assert.equal(cues[0]?.id, first.id);
  assert.equal(cues[0]?.priority, "high");
  assert.equal(cues[0]?.detail, "Force baseline hard.");
  cues = removeTimeoutCue(cues, first.id);
  assert.equal(cues.length, 1);
  assert.equal(cues[0]?.coverage, "drop");
});

test("addTimeoutCue respects max cap", () => {
  let cues = mergeTimeoutCues(undefined, []);
  for (let i = 0; i < TIMEOUT_CUES_MAX + 2; i += 1) {
    const cue = createManualTimeoutCue({
      title: `Cue ${i}`,
      detail: `Detail ${i}`,
      coverage: "other",
      priority: "medium",
    });
    assert.ok(cue);
    cues = addTimeoutCue(cues, cue!);
  }
  assert.equal(cues.length, TIMEOUT_CUES_MAX);
});
