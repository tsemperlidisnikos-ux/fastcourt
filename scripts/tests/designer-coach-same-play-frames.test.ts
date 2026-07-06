import assert from "node:assert/strict";
import { buildSamePlayFrameAlternatives } from "../../src/lib/designer/designer-coach-same-play-frames";
import type { DesignerCoachPlayContext } from "../../src/lib/designer/analyze-play-locally";

const play: DesignerCoachPlayContext = {
  id: "play-1",
  title: "Horns PNR",
  courtType: "half",
  frames: [
    {
      id: "primary",
      name: "Entry",
      objects: [],
      actions: [],
    },
    {
      id: "read-ice",
      name: "If ICE",
      objects: [],
      actions: [],
      readBranch: {
        parentFrameId: "primary",
        coverage: "ice",
        label: "If ICE",
      },
    },
    {
      id: "frame-3",
      name: "Weak side flash",
      objects: [],
      actions: [],
    },
  ],
};

const fromPrimary = buildSamePlayFrameAlternatives(play, 0);
assert.ok(
  fromPrimary.some((row) => row.kind === "same-play" && row.title === "If ICE"),
  "expected read branch from primary frame",
);
assert.equal(fromPrimary[0]?.kind, "same-play");
assert.ok((fromPrimary[0]?.scorePct ?? 0) >= 90, "read branch should rank first");

const fromRead = buildSamePlayFrameAlternatives(play, 1);
assert.ok(
  fromRead.some((row) => row.title === "Entry"),
  "expected primary frame when editing a read",
);
assert.ok(
  fromRead.some((row) => row.title === "Weak side flash"),
  "expected sibling primary frame",
);

const singleFrame = buildSamePlayFrameAlternatives(
  { ...play, frames: [play.frames[0]!] },
  0,
);
assert.equal(singleFrame.length, 0, "single-frame plays should have no same-play alts");

console.log("designer-coach-same-play-frames.test.ts OK");
