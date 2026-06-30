import assert from "node:assert/strict";
import { isPracticeItemMissing } from "../../src/lib/practice/practice-items";

const missing = isPracticeItemMissing({
  item: {
    id: "pi_1",
    playId: "deleted_play",
    durationMin: 10,
    notes: "",
  },
  play: null,
  index: 0,
  label: null,
});
assert.equal(missing, true);

const cue = isPracticeItemMissing({
  item: {
    id: "pi_2",
    cueLabel: "Warm-up",
    durationMin: 8,
    notes: "",
  },
  play: null,
  index: 1,
  label: "Warm-up",
});
assert.equal(cue, false);

const linked = isPracticeItemMissing({
  item: {
    id: "pi_3",
    playId: "play_a",
    durationMin: 12,
    notes: "",
  },
  play: {
    id: "play_a",
    title: "Horns",
    type: "play",
    courtType: "half",
    frames: [],
    updatedAt: "",
    createdAt: "",
  } as never,
  index: 2,
  label: "Horns",
});
assert.equal(linked, false);

console.log("practice-missing-play.test.ts: ok");
