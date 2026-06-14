import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeFrameObjectsAfterSteps,
  getPlaybackActionIds,
} from "@/lib/designer/animation-engine";
import { makeAction, makeFrame, offense } from "./helpers";

describe("animation engine", () => {
  it("getPlaybackActionIds skips optional actions", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.5, 0.6, true)],
      [
        { ...makeAction("pass", 0.5, 0.6, 0.3, 0.4, "p1"), timing: "optional" },
        makeAction("cut", 0.3, 0.4, 0.4, 0.3, "c1"),
      ],
    );
    const ids = getPlaybackActionIds(frame);
    assert.deepEqual(ids, ["c1"]);
  });

  it("computeFrameObjectsAfterSteps applies pass mid-sequence", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.5, 0.6, true), offense("o2", "2", 0.3, 0.4)],
      [makeAction("pass", 0.5, 0.6, 0.3, 0.4, "p1")],
    );

    const step0 = computeFrameObjectsAfterSteps(frame, 0);
    assert.equal(step0.find((o) => o.label === "1")?.hasBall, true);

    const step1 = computeFrameObjectsAfterSteps(frame, 1);
    assert.equal(step1.find((o) => o.label === "2")?.hasBall, true);
    assert.equal(step1.find((o) => o.label === "1")?.hasBall, false);
  });
});
